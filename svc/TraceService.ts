/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistService,
    InitContext,
    PlainObject,
    XH,
    Span,
    SpanConfig,
    SpanConfigLike
} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, parseNameSource} from '@xh/hoist/utils/js';
import {every, forEach, groupBy, isEmpty, isString, omitBy} from 'lodash';

/**
 * Client-side distributed tracing service for Hoist applications.
 *
 * Creates spans for user actions, fetch calls, and app bootstrap. Sends `traceparent`
 * headers on outgoing requests so server-side spans nest under client spans, producing
 * end-to-end traces from user interaction through server processing and back.
 *
 * Controlled by the `xhTraceConfig` soft config. When disabled (the default), spans are
 * still created and passed to wrapped functions but are flagged as unsampled and never
 * exported - callers can interact with the span without null checks.
 *
 * To support tracing from the earliest moments of app startup this service is installed
 * before any other, well before Config can be loaded. Spans created during that
 * window are marked with `sampled === null` (decision deferred) and held in a pending bucket.
 * Once config arrives, {@link noteConfigAvailable} the service walks the bucket, and applies
 * sampling rules per-trace.  Outbound `traceparent` headers send `00` in the undetermined state
 * so server-side spans don't sample without a client decision.
 *
 * Completed spans are batched and exported to the Hoist server endpoint `xh/submitSpans`,
 * which relays them to the configured collector.
 */
export class TraceService extends HoistService {
    static instance: TraceService;

    /** Spans whose sampling has been decided and are queued for export. */
    private _pending: Span[] = [];

    /** Config. Will be loaded when available. */
    private conf: TraceConfig = null;

    /** Spans created before config available. */
    private _preConfigSpans: Span[] = [];

    //------------------
    // Initialization
    //------------------
    override async initAsync(ctx: InitContext) {
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
    }

    //------------------
    // Configuration
    //------------------
    /** Is tracing currently enabled? */
    get enabled(): boolean {
        return this.conf?.enabled ?? false;
    }

    //------------------
    // Span Lifecycle
    //------------------
    /**
     * Create a span wrapping an async operation.
     * Automatically handles timing, error recording, and export.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     * @param fn - the async function to wrap.
     */
    override async withSpan<T>(config: SpanConfigLike, fn: (span: Span) => Promise<T>): Promise<T> {
        const span = this.createSpan(config);
        try {
            const result = await fn(span);
            span.end();
            return result;
        } catch (e) {
            span.recordException(e);
            span.end();
            throw e;
        } finally {
            this.exportSpan(span);
        }
    }

    //------------------
    // Implementation
    //------------------
    /**
     * Create a new span. Always returns a span - when tracing is disabled the returned span
     * is flagged unsampled and will never be exported, so callers can interact with it safely.
     *
     * The `xh.source` tag defaults to `'hoist'` for spans whose name starts with `'xh.'` and
     * `'app'` otherwise. Callers may override all tag values, including setting to null to prevent
     *  any default tag from being applied.
     *
     * Sampling rules from `xhTraceConfig.sampleRules` are evaluated against the span's tags
     * at creation time (head-based). Child spans inherit their parent's sampling decision.
     * Spans created before `xhTraceConfig` is loaded (during early app startup) are marked
     * `sampled === null` and parked in a pending bucket; {@link noteConfigAvailable} decides their
     * fate once config arrives.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     */
    private createSpan(config: string | SpanConfig): Span {
        const ret: SpanConfig = isString(config) ? {name: config} : {...config};

        // Apply default tags - safe to call even before identity is resolved (getUsername is null).
        // Remove nulls they are used in this API to just prevent defaults
        ret.tags = {
            'xh.clientApp': XH.clientAppCode,
            'xh.loadId': XH.loadId,
            'xh.tabId': XH.tabId,
            'xh.source': ret.name.startsWith('xh.') ? 'hoist' : 'app',
            ...(ret.caller ? {'code.namespace': parseNameSource(ret.caller)} : {}),
            ...this.identityTags(),
            ...ret.tags
        };
        ret.tags = omitBy(ret.tags, v => v == null);

        const span = new Span(ret);

        // Handle sampling for roots. If config available compute, otherwise defer
        if (span.sampled === null) {
            if (this.conf) {
                span.sampled = this.computeSampled(span);
            } else {
                this._preConfigSpans.push(span);
            }
        }

        return span;
    }

    //------------------
    // Span Export
    //------------------
    /**
     * Submit a completed span for export. Spans whose sampling is still undecided are held
     * for {@link noteConfigAvailable}; sampled spans are queued and flushed on a debounced timer.
     */
    private exportSpan(span: Span) {
        if (!this.enabled || span.sampled === null) return; // defer until config is loaded.

        if (span.sampled) {
            this._pending.push(span);

            // Queue the push unless its submitSpans export itself (avoid looping).
            if (!span.tags['url.full']?.endsWith('xh/submitSpans')) {
                this.pushPendingBuffered();
            }
        }
    }

    /**
     * Push all pending spans to the server.
     * Called on debounced interval and on page unload.
     */
    private async pushPendingAsync() {
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
        this.conf = {enabled: false, ...XH.configService.get('xhTraceConfig', {})};

        // Group by traceId so we can resolve sampling once at root. Re-export any spans that
        // have already ended - their own finally-block `exportSpan` early-returned on null.
        // Spans still in flight will export correctly when they end.
        forEach(groupBy(this._preConfigSpans, 'traceId'), spans => {
            // record the now available identity
            const tags = this.identityTags();
            spans.forEach(s => {
                s.setTags(tags);
            });

            // sample and export as needed
            const rootSampled = this.computeSampled(spans.find(s => !s.parent) ?? spans[0]);
            spans.forEach(s => {
                s.sampled = rootSampled;
                if (s.endTime) this.exportSpan(s);
            });
        });

        this._preConfigSpans = null;
    }

    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        void this.pushPendingAsync();
    }

    /**
     * Resolve a root-span sampling decision: a probabilistic decision from `sampleRules`. Rules
     * match on tag keys; the reserved key `name` matches the span's name (glob-capable, same
     * syntax as tag-value patterns).
     */
    private computeSampled(span: Span): boolean {
        if (!this.enabled) return false;
        try {
            return Math.random() < this.getSampleRate(span);
        } catch (e) {
            this.logError('Failed to compute sample rate', e);
            return false;
        }
    }

    private getSampleRate(span: Span): number {
        const {conf} = this;
        for (const rule of conf.sampleRules ?? []) {
            if (
                every(rule.match, (v, k) =>
                    this.matchesValue(k === 'name' ? span.name : span.tags[k], v)
                )
            ) {
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

    private identityTags(): PlainObject {
        if (!XH.identityService) return {};
        const {authUsername, username} = XH.identityService,
            ret: PlainObject = {'user.name': authUsername};
        if (username != authUsername) {
            ret['xh.impersonating'] = username;
        }
        return ret;
    }
}

interface TraceConfig {
    enabled: boolean;
    sampleRules?: SampleRule[];
    sampleRate?: number;
}

interface SampleRule {
    match: Record<string, string>;
    sampleRate: number;
}
