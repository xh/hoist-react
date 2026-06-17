/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CallContextLike, FullSpanConfig, Some, SpanConfig, TrackOptions, XH} from '@xh/hoist/core';
import {CallContext} from './CallContext';
import {PromiseLinkSpec} from '@xh/hoist/promise';
import {FetchOptions} from '@xh/hoist/svc';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

export type RunFunction<T> = (ctx: CallContext) => Promise<T>;

/**
 * Fluent builder used to execute async work inside a {@link CallContext}, with optional spanning,
 * logging, tracking, metering, and link-to-task observability composed via chained methods.
 *
 * Constructed via {@link HoistBase.runner} - apps don't instantiate directly. The chain ends
 * with a terminal method (`run(fn)` or one of the fetch shortcuts), which executes the work
 * under the configured `CallContext`.
 */
export class Runner {
    private readonly ctx: CallContext;
    private readonly caller: NameSource;

    private spanConfig: FullSpanConfig = null;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private trackOptions: TrackOptions;
    private linkSpec: PromiseLinkSpec;
    private counterMetric: {name: string; tags?: Record<string, string>} = null;
    private timerMetric: {name: string; tags?: Record<string, string>} = null;

    static create(ctx: CallContextLike = null, caller?: NameSource) {
        return new Runner(ctx, caller);
    }

    private constructor(ctx: CallContextLike, caller?: NameSource) {
        this.ctx = ctx instanceof CallContext ? ctx : new CallContext(ctx);
        this.caller = caller;
    }

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a new trace span within this context. */
    span(config: string | SpanConfig): this {
        config = isString(config) ? {name: config} : config;
        const {caller, ctx} = this,
            prefix = (caller as any)?.telemetryPrefix,
            name = prefix ? `${prefix}.${config.name}` : config.name,
            // Explicit remote traceparent (config.parent) wins; else nest under call-context span.
            parent = config.parent ?? ctx.span;
        this.spanConfig = {...config, name, parent, caller};
        return this;
    }

    //---------------------------
    // Log/Track configuration
    //---------------------------
    /** Time and log completion at info level via {@link withInfo}. */
    logInfo(msgs: Some<unknown>): this {
        this.infoMsgs = msgs;
        return this;
    }

    /** Time and log completion at debug level via {@link withDebug}. */
    logDebug(msgs: Some<unknown>): this {
        this.debugMsgs = msgs;
        return this;
    }

    /** Track via Hoist activity tracking. */
    track(opts: TrackOptions | string): this {
        this.trackOptions = isString(opts) ? {message: opts} : opts;
        return this;
    }

    /** Link execution to a {@link TaskObserver} for masking and progress messages. */
    linkTo(spec: PromiseLinkSpec): this {
        this.linkSpec = spec;
        return this;
    }

    //---------------------------
    // Metrics configuration
    //---------------------------
    /**
     * Increment a metric counter on completion of the wrapped fn. An `xh.outcome` tag is
     * added with value `success` or `failure` based on whether the fn threw.
     */
    counter(name: string, tags?: Record<string, string>): this {
        this.counterMetric = {name, tags};
        return this;
    }

    /**
     * Record elapsed time for the wrapped fn. Recorded regardless of success or failure;
     * an `xh.outcome` tag is added with value `success` or `failure`.
     */
    timer(name: string, tags?: Record<string, string>): this {
        this.timerMetric = {name, tags};
        return this;
    }

    //---------------------------
    // Terminal
    //---------------------------
    /** Execute an async fn with all configured observability. */
    run<T>(fn: RunFunction<T>): Promise<T> {
        return this.executeWrapped(fn);
    }

    /**
     * Issue a raw fetch within the call context.
     * @see FetchService.fetch
     */
    fetch(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.fetch(options, ctx));
    }

    /**
     * Issue a JSON fetch within the call context.
     * @see FetchService.fetchJson
     */
    fetchJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.fetchJson(options, ctx));
    }

    /**
     * Issue a JSON GET within the call context.
     * @see FetchService.getJson
     */
    getJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.getJson(options, ctx));
    }

    /**
     * Issue a JSON POST within the call context.
     * @see FetchService.postJson
     */
    postJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.postJson(options, ctx));
    }

    /**
     * Issue a JSON PUT within the call context.
     * @see FetchService.putJson
     */
    putJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.putJson(options, ctx));
    }

    /**
     * Issue a JSON PATCH within the call context.
     * @see FetchService.patchJson
     */
    patchJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.patchJson(options, ctx));
    }

    /**
     * Issue a JSON DELETE within the call context.
     * @see FetchService.deleteJson
     */
    deleteJson(options: FetchOptions): Promise<any> {
        return this.executeWrapped(ctx => XH.fetchService.deleteJson(options, ctx));
    }

    //-------------------------
    // Implementation
    //--------------------------
    private executeWrapped<T>(fn: RunFunction<T>): Promise<T> {
        fn = this.wrapMetrics(fn);
        fn = this.wrapLink(fn);
        fn = this.wrapTrack(fn);
        fn = this.wrapLog(fn);

        const {spanConfig, ctx} = this;
        return spanConfig
            ? XH.traceService.withSpan(spanConfig, span => fn(ctx.cloneWithSpan(span)))
            : fn(ctx);
    }

    private wrapMetrics<S>(fn: RunFunction<S>): RunFunction<S> {
        const {timerMetric: t, counterMetric: c} = this,
            svc = XH.metricsService;
        if (!t && !c) return fn;
        return async ctx => {
            const start = performance.now();
            let outcome = 'failure';
            try {
                const result = await fn(ctx);
                outcome = 'success';
                return result;
            } finally {
                if (t) {
                    const elapsed = performance.now() - start;
                    svc.recordTimer(t.name, elapsed, {...t.tags, 'xh.outcome': outcome});
                }
                if (c) {
                    svc.recordCount(c.name, 1, {...c.tags, 'xh.outcome': outcome});
                }
            }
        };
    }

    private wrapLog<S>(fn: RunFunction<S>): RunFunction<S> {
        const {debugMsgs, infoMsgs} = this;

        if (debugMsgs != null && getLogLevel() === 'debug') {
            return ctx => withDebug(debugMsgs, () => fn(ctx), this.caller);
        } else if (infoMsgs != null) {
            return ctx => withInfo(infoMsgs, () => fn(ctx), this.caller);
        }
        return fn;
    }

    private wrapTrack<S>(fn: RunFunction<S>): RunFunction<S> {
        const {trackOptions} = this;
        if (!trackOptions) return fn;
        return ctx => fn(ctx).track({...trackOptions, loadSpec: ctx.loadSpec});
    }

    private wrapLink<S>(fn: RunFunction<S>): RunFunction<S> {
        const {linkSpec} = this;
        if (!linkSpec) return fn;
        return ctx => fn(ctx).linkTo(linkSpec);
    }
}
