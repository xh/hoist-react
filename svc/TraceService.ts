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
 * Client-side sampling has been removed — every span is submitted to the Hoist server, which
 * applies unified tail-sampling across both client and server spans. User/identity tagging is
 * likewise handled server-side (authoritative) and is intentionally not stamped here.
 *
 * Completed spans are batched and exported to the Hoist server endpoint `xh/submitSpans`,
 * which deposits them into the server's tail-sampling buffer.
 */
export class TraceService extends HoistService {
    static instance: TraceService;

    private _pending: Span[] = [];
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
     * Called by {@link ConfigService} once `xhTraceConfig` has loaded. Records the enabled
     * flag so subsequent spans will be exported; spans created earlier in the app lifecycle
     * are already buffered for export.
     *
     * @internal - for framework use only.
     */
    noteConfigAvailable() {
        this.conf = {enabled: false, ...XH.configService.get('xhTraceConfig', {})};
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

    /** Queue a completed span for export. No client-side keep/drop — the server decides. */
    private exportSpan(span: Span) {
        if (!this.enabled) return;
        this._pending.push(span);

        // Don't recursively batch the submit call itself.
        if (!span.tags['url.path']?.endsWith('xh/submitSpans')) {
            this.pushPendingBuffered();
        }
    }

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
