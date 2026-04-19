/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, parseNameSource} from '@xh/hoist/utils/js';
import {every, isEmpty, isString} from 'lodash';
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
 * Completed spans are batched and exported to the Hoist server endpoint `xh/submitSpans`,
 * which relays them to the configured collector.
 *
 */
export class TraceService extends HoistService {
    static instance: TraceService;

    private _pending: Span[] = [];

    //------------------
    // Initialization
    //------------------
    override async initAsync() {
        if (!this.enabled) return;
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
    }

    //------------------
    // Configuration
    //------------------
    /** Parsed tracing config from server soft-config. */
    get conf(): TraceConfig {
        return {
            enabled: false,
            ...XH.getConf('xhTraceConfig', {})
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
     * Inherits the parent's `source` tag if not specified.
     *
     * Sampling rules from `xhTraceConfig.sampleRules` are evaluated against the span's tags
     * at creation time (head-based). Child spans inherit their parent's sampling decision.
     * Unsampled spans may still be exported if they end in error and `alwaysSampleErrors` is
     * enabled — see {@link exportSpan}.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     */
    createSpan(config: string | SpanConfig): Span {
        const ret: SpanConfig = isString(config) ? {name: config} : {...config};

        if (!this.enabled) return new Span({...ret, sampled: false});

        // Apply default tags.
        ret.tags = {
            'xh.clientApp': XH.clientAppCode,
            'xh.loadId': XH.loadId,
            'xh.tabId': XH.tabId,
            'xh.source': ret.source ?? ret.parent?.tags?.['xh.source'] ?? 'app',
            'user.name': XH.getUsername(),
            ...(ret.caller ? {'code.namespace': parseNameSource(ret.caller)} : {}),
            ...ret.tags
        };

        // Sampling: children inherit parent decision; root spans evaluate rules.
        ret.sampled = ret.parent ? ret.parent.sampled : this.shouldSample(ret.tags);

        return new Span(ret);
    }

    //------------------
    // Span Export
    //------------------
    /** Submit a completed span for export. */
    exportSpan(span: Span) {
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
    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        void this.pushPendingAsync();
    }

    /** Evaluate sampling rules against a span's tags. */
    private shouldSample(tags: PlainObject): boolean {
        try {
            return Math.random() < this.getSampleRate(tags);
        } catch (e) {
            this.logError('Failed to compute sample rate', e);
            return false;
        }
    }

    private getSampleRate(tags: PlainObject): number {
        const {conf} = this;
        for (const rule of conf.sampleRules ?? []) {
            if (every(rule.match, (v, k) => this.matchesValue(tags[k], v))) {
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
    sampleRules?: SamplingRule[];
    sampleRate?: number;
    alwaysSampleErrors?: boolean;
}

interface SamplingRule {
    match: Record<string, string>;
    sampleRate: number;
}
