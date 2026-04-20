/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, parseNameSource} from '@xh/hoist/utils/js';
import {every, forEach, groupBy, isEmpty, isString} from 'lodash';
import {Span, SpanConfig} from '@xh/hoist/utils/telemetry';

/**
 * Client-side distributed tracing service for Hoist applications.
 *
 * Creates spans for user actions, fetch calls, and app bootstrap. Sends `traceparent`
 * headers on outgoing requests so server-side spans nest under client spans, producing
 * end-to-end traces from user interaction through server processing and back.
 *
 * Controlled by the `xhTraceConfig` soft config. When disabled (the default), spans are
 * still created and passed to wrapped functions, but are flagged as unsampled and never
 * exported - callers can interact with the span without null checks.
 *
 * To support tracing from the earliest moments of app startup, this service is installed
 * before any other, well before Config can be loaded. Spans created during that
 * window are marked with `sampled === null` (decision deferred) and held in a pending bucket.
 * Once config arrives, {@link noteConfigAvailable} walks the bucket, and applies sampling rules
 * per-trace.  Outbound `traceparent` headers send `00` while undecided so server-side spans don't
 * sample without a client decision.
 *
 * Completed spans are batched and exported to the Hoist server endpoint `xh/submitSpans`,
 * which relays them to the configured collector.
 */
export class TraceService extends HoistService {
    static instance: TraceService;

    /** Spans whose sampling has been decided and are queued for export. */
    private _pending: Span[] = [];

    /**
     * Spans created before sampling config is loaded - held here until {@link noteConfigAvailable}
     * resolves them. Nulled out once config is available, which also gates `shouldSample` out of
     * its "deferred" branch.
     */
    private _pendingConfig: Span[] = [];

    //------------------
    // Initialization
    //------------------
    override async initAsync(span: Span) {
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
    }

    //------------------
    // Configuration
    //------------------
    /** Parsed tracing config from server soft-config */
    get conf(): TraceConfig {
        return {
            enabled: false,
            ...(XH.configService?.get('xhTraceConfig', {}) ?? {})
        };
    }

    /** Is tracing currently enabled? */
    get enabled(): boolean {
        return this.conf.enabled;
    }

    //------------------
    // Span Lifecycle
    //------------------
    /**
     * Create a span wrapping a synchronous operation.
     * Automatically handles timing, error recording, and export.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     * @param fn - the function to wrap.
     */
    override withSpan<T>(config: string | SpanConfig, fn: (span: Span) => T): T {
        const span = this.createSpan(config);
        try {
            const result = fn(span);
            span.end('ok');
            return result;
        } catch (e) {
            span.recordError(e);
            span.end('error');
            throw e;
        } finally {
            this.exportSpan(span);
        }
    }

    /**
     * Create a span wrapping an async operation.
     * Automatically handles timing, error recording, and export.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     * @param fn - the async function to wrap.
     */
    override async withSpanAsync<T>(
        config: string | SpanConfig,
        fn: (span: Span) => Promise<T>
    ): Promise<T> {
        const span = this.createSpan(config);
        try {
            const result = await fn(span);
            span.end('ok');
            return result;
        } catch (e) {
            span.recordError(e);
            span.end('error');
            throw e;
        } finally {
            this.exportSpan(span);
        }
    }

    /**
     * Create a new span. Always returns a span - when tracing is disabled the returned span
     * is flagged unsampled and will never be exported, so callers can interact with it safely.
     *
     * The `xh.source` tag defaults to `'hoist'` for spans whose name starts with `'xh.'` and
     * `'app'` otherwise. Callers may override via `tags`.
     *
     * Sampling rules from `xhTraceConfig.sampleRules` are evaluated against the span's tags
     * at creation time (head-based). Child spans inherit their parent's sampling decision.
     * Spans created before `xhTraceConfig` is loaded (during early app startup) are marked
     * `sampled === null` and parked in a pending bucket; {@link noteConfigAvailable} decides their
     * fate once config arrives. Unsampled spans may still be exported if they end in error and
     * `alwaysSampleErrors` is enabled - see {@link exportSpan}.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     */
    createSpan(config: string | SpanConfig): Span {
        const ret: SpanConfig = isString(config) ? {name: config} : {...config};

        // Apply default tags - safe to call even before identity is resolved (getUsername is null).
        ret.tags = {
            'xh.clientApp': XH.clientAppCode,
            'xh.loadId': XH.loadId,
            'xh.tabId': XH.tabId,
            'xh.source': ret.name.startsWith('xh.') ? 'hoist' : 'app',
            'user.name': XH.getUsername(),
            ...(ret.caller ? {'code.namespace': parseNameSource(ret.caller)} : {}),
            ...ret.tags
        };

        // Sampling: children inherit; roots evaluate rules.
        ret.sampled = ret.parent ? ret.parent.sampled : this.shouldSample(ret.name, ret.tags);

        const span = new Span(ret);
        if (span.sampled === null) this._pendingConfig?.push(span);
        return span;
    }

    //------------------
    // Span Export
    //------------------
    /**
     * Submit a completed span for export. Spans whose sampling is still undecided are held
     * for {@link noteConfigAvailable}; sampled spans are queued and flushed on a debounced timer.
     */
    exportSpan(span: Span) {
        // Defer - decision will be made once xhTraceConfig is loaded.
        if (span.sampled === null) return;
        if (!this.enabled) return;
        if (span.sampled || (this.conf.alwaysSampleErrors && span.status === 'error')) {
            this._pending.push(span);

            // Queue the span, but if this is the submitSpans export itself, don't schedule
            // another flush or we'll loop forever.
            if (!span.tags['url.path']?.endsWith('xh/submitSpans')) {
                this.pushPendingBuffered();
            }
        }
    }

    /**
     * Push all pending spans to the server.
     * Called on debounced interval and on page unload.
     */
    async pushPendingAsync() {
        const spans = this._pending;
        if (isEmpty(spans)) return;

        this._pending = [];
        try {
            await XH.fetchService.postJson({
                url: 'xh/submitSpans',
                body: spans.map(s => s.toJSON()),
                params: {
                    clientUsername: XH.getUsername()
                }
            });
        } catch (e) {
            this.logError('Failed to push spans', e);
        }
    }

    //------------------
    // Implementation
    //------------------
    /**
     * Called by {@link ConfigService} once `xhTraceConfig` has loaded. Applies sampling
     * decisions to all spans created during early startup and held in the pendingConfig
     * bucket.
     *
     * For each trace represented in the pending bucket: the root span (or oldest-known
     * ancestor) is evaluated against the sampling rules, and the decision is propagated
     * to every span in that trace. Sampled, ended spans are exported at this time.
     *
     * @internal - for framework use only.
     */
    noteConfigAvailable() {
        const pending = this._pendingConfig;
        this._pendingConfig = null;

        // Group by traceId so we can resolve sampling once at root. Re-export any spans that
        // have already ended - their own finally-block `exportSpan` early-returned on null.
        // Spans still in flight will export correctly when they end.
        forEach(groupBy(pending, 'traceId'), spans => {
            const root = spans.find(s => !s.parentSpanId) ?? spans[0],
                decision = this.shouldSample(root.name, root.tags);
            spans.forEach(s => {
                s.sampled = decision;
                if (s.endTime) this.exportSpan(s);
            });
        });
    }

    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        void this.pushPendingAsync();
    }

    /**
     * Resolve a root-span sampling decision: returns `null` to defer until config is loaded,
     * `false` when tracing is disabled, or a probabilistic decision from `sampleRules`. Rules
     * match on tag keys; the reserved key `name` matches the span's name (glob-capable, same
     * syntax as tag-value patterns).
     */
    private shouldSample(name: string, tags: PlainObject): boolean | null {
        if (this._pendingConfig) return null;
        if (!this.enabled) return false;
        try {
            return Math.random() < this.getSampleRate(name, tags);
        } catch (e) {
            this.logError('Failed to compute sample rate', e);
            return false;
        }
    }

    private getSampleRate(name: string, tags: PlainObject): number {
        const {conf} = this;
        for (const rule of conf.sampleRules ?? []) {
            if (every(rule.match, (v, k) => this.matchesValue(k === 'name' ? name : tags[k], v))) {
                return rule.sampleRate;
            }
        }
        return conf.sampleRate;
    }

    /** For strings, simple glob matching: `*` = any, `foo*` = prefix, `*foo` = suffix, `*foo*` = contains. */
    private matchesValue(actual: any, pattern: any): boolean {
        if (!isString(actual) || !isString(pattern)) {
            return actual === pattern;
        }

        if (pattern === '*') return true;
        const startsWithWild = pattern.startsWith('*'),
            endsWithWild = pattern.endsWith('*'),
            core = pattern.replace(/^\*|\*$/g, '');

        if (startsWithWild && endsWithWild) return actual.includes(core);
        if (startsWithWild) return actual.endsWith(core);
        if (endsWithWild) return actual.startsWith(core);
        return actual === pattern;
    }
}

interface TraceConfig {
    enabled: boolean;
    sampleRules?: SampleRule[];
    sampleRate?: number;
    alwaysSampleErrors?: boolean;
}

interface SampleRule {
    match: Record<string, string>;
    sampleRate: number;
}
