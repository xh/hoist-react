/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced} from '@xh/hoist/utils/js';
import {isEmpty, isString} from 'lodash';
import {formatTraceparent, Span, SpanConfig} from '@xh/hoist/utils/telemetry';

/**
 * Client-side distributed tracing service for Hoist applications.
 *
 * Creates spans for user actions, fetch calls, and app bootstrap. Sends `traceparent`
 * headers on outgoing requests so server-side spans nest under client spans, producing
 * end-to-end traces from user interaction through server processing and back.
 *
 * Controlled by the `xhTraceConfig` soft config. When disabled (the default), all
 * span-creation methods are no-ops — the wrapped function still executes normally.
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
        this.installFetchSpans();
    }

    //------------------
    // Configuration
    //------------------
    /** Parsed tracing config from server soft-config. */
    get conf(): TraceConfig {
        return {
            enabled: false,
            sampleRate: 1.0,
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
     * Create a span wrapping an async operation.
     * Automatically handles timing, error recording, and export.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     * @param fn - the async function to wrap.
     */
    async withSpanAsync<T>(
        config: string | SpanConfig,
        fn: (span: Span) => Promise<T>
    ): Promise<T> {
        const span = this.createSpan(config);
        if (!span) return fn(null);

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
     * Create a new span, or return null if tracing is disabled or the span is sampled out.
     * Inherits the parent's `source` tag if not specified.
     *
     * @param config - span name string, or a SpanConfig with name and optional tags.
     */
    createSpan(config: string | SpanConfig): Span {
        if (!this.enabled) return null;

        const ret: SpanConfig = isString(config) ? {name: config} : {...config};

        // Apply sampling to root spans
        if (!ret.parent && Math.random() >= this.conf.sampleRate) {
            return null;
        }

        // Apply default tags.
        ret.tags = {
            clientApp: XH.clientAppCode,
            loadId: XH.loadId,
            tabId: XH.tabId,
            source: ret.parent?.tags?.source ?? 'app',
            ...ret.tags
        };

        return new Span(ret);
    }

    //------------------
    // Span Export
    //------------------
    /** Submit a completed span for export. */
    exportSpan(span: Span) {
        this._pending.push(span);
        this.pushPendingBuffered();
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
        this.pushPendingAsync();
    }

    //-----------------------------------------------
    // FetchService Integration
    //-----------------------------------------------
    private installFetchSpans() {
        XH.fetchService.addDefaultHeaders(opts => {
            if (!this.enabled) return {};

            const span = this.startFetchSpan(opts);
            if (span) {
                (opts as any)._tracingSpan = span;
                return {traceparent: formatTraceparent(span.traceId, span.spanId)};
            }
            return {};
        });

        XH.fetchService.addInterceptor({
            onFulfilled: async (opts, value) => {
                this.endFetchSpan(opts, value);
                return value;
            },
            onRejected: async (opts, cause) => {
                this.endFetchSpan(opts, null, cause);
                throw cause;
            }
        });
    }

    private startFetchSpan(opts: PlainObject): Span {
        const method = opts.method ?? 'GET',
            url = this.extractUrlPath(opts.url);

        if (url.endsWith('submitSpans')) return null;

        return this.createSpan({
            name: `fetch ${method} ${url}`,
            parent: opts.span,
            tags: {'http.method': method, 'http.url': url, source: 'hoist'}
        });
    }

    private endFetchSpan(opts: PlainObject, value?: any, error?: unknown) {
        const span: Span = (opts as any)._tracingSpan;
        if (!span) return;

        if (value?.status != null) {
            span.tags['http.status_code'] = value.status;
        }

        if (error) {
            span.recordError(error);
            span.end('error');
        } else {
            span.end('ok');
        }
        this.exportSpan(span);
    }

    private extractUrlPath(url: string): string {
        if (!url) return '';
        try {
            // Strip origin for absolute URLs
            if (url.includes('//')) {
                return new URL(url).pathname;
            }
            return url.split('?')[0];
        } catch (e) {
            return url.split('?')[0];
        }
    }
}

interface TraceConfig {
    enabled: boolean;
    sampleRate: number;
}
