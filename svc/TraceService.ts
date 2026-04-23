/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, InitContext, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, parseNameSource} from '@xh/hoist/utils/js';
import {isEmpty, isString, omitBy} from 'lodash';
import {Span, SpanConfig} from '@xh/hoist/utils/telemetry';

/**
 * Client-side distributed tracing service for Hoist applications.
 *
 * Creates spans for user actions, fetch calls, and app bootstrap. Sends `traceparent` headers
 * on outgoing requests so server-side spans nest under client spans, producing end-to-end
 * traces from user interaction through server processing and back.
 *
 * Completed spans are batched and exported to the Hoist server endpoint `xh/submitSpans`,
 * which enhances and samples them, before relaying them to the configured collector.
 */
export class TraceService extends HoistService {
    static instance: TraceService;

    /** Spans that are queued for export. */
    private _pending: Span[] = [];

    /** Config. Will be loaded when available. */
    private conf: TraceConfig = null;

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
     * Called by {@link ConfigService} once `xhTraceConfig` has loaded.
     * @internal - for framework use only.
     */
    noteConfigAvailable() {
        this.conf = {enabled: false, ...XH.configService.get('xhTraceConfig', {})};
        if (this.enabled) {
            this.pushPendingBuffered();
        } else {
            this._pending = [];
        }
    }

    //------------------
    // Implementation
    //------------------
    /**
     * Create a new span. Always returns a span — callers can interact with it safely regardless
     * of whether tracing is enabled.
     *
     * Defaults `xh.source` to `'hoist'` for spans whose name starts with `'xh.'`, `'app'` otherwise.
     * Callers may override all tag values, including setting to null to prevent a default.
     */
    private createSpan(config: string | SpanConfig): Span {
        const ret: SpanConfig = isString(config) ? {name: config} : {...config};

        // Apply default tags
        // Remove nulls - they are used in this API to just prevent defaults
        ret.tags = {
            'xh.clientApp': XH.clientAppCode,
            'xh.loadId': XH.loadId,
            'xh.tabId': XH.tabId,
            'xh.source': ret.name.startsWith('xh.') ? 'hoist' : 'app',
            ...(ret.caller ? {'code.namespace': parseNameSource(ret.caller)} : {}),
            ...ret.tags
        };
        ret.tags = omitBy(ret.tags, v => v == null);

        return new Span(ret);
    }

    private exportSpan(span: Span) {
        // Config hasn't arrived yet, just save it, we don't know if we are enabled
        if (!this.conf) {
            this._pending.push(span);
            return;
        }

        // Otherwise normal processing.
        if (!this.enabled) return;
        this._pending.push(span);

        // Don't recursively batch the submit call itself.
        if (!span.tags['url.full']?.includes('xh/submitSpans')) {
            this.pushPendingBuffered();
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

    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        void this.pushPendingAsync();
    }
}

interface TraceConfig {
    enabled: boolean;
}
