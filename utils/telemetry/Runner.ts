/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    Some,
    TrackOptions,
    XH,
    Span,
    SpanConfig,
    SpanConfigLike,
    CallContext
} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import {RunContext} from './RunContext';

export type RunFunction<T> = (ctx: RunContext) => Promise<T>;

/**
 * Builder used internally by Hoist to execute a function within a {@link LoadSpec} or {@link Span},
 * with optional logging, tracking, and span configuration. Produces a {@link RunContext} for the
 * wrapped function.
 *
 * @internal - This is an experimental API used by Hoist's telemetry/run infrastructure.
 *      Not yet intended for direct construction or extension by application code.
 */
export class Runner {
    private readonly ctx: RunContext;

    private spanConfig: SpanConfig = null;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private trackOptions: TrackOptions;

    static create(ctx: CallContext, caller: NameSource) {
        return new Runner(ctx, caller);
    }

    constructor(ctx: CallContext, caller: NameSource) {
        this.ctx = new RunContext(ctx, caller);
    }

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a new trace span within this context. */
    newSpan(config: SpanConfigLike): this {
        config = isString(config) ? {name: config} : config;
        const {ctx} = this;
        this.spanConfig = {...config, parent: ctx.span, caller: ctx.caller};
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

    //---------------------------
    // Terminal
    //---------------------------
    /** Execute an async fn with all configured observability. */
    run<T>(fn: RunFunction<T>): Promise<T> {
        return this.executeWrapped(fn);
    }

    fetchJson(options: FetchOptions): Promise<any> {
        const fn = (ctx: RunContext) => ctx.fetchJson(options);
        return this.executeWrapped(fn);
    }

    postJson(options: FetchOptions): Promise<any> {
        const fn = (ctx: RunContext) => ctx.postJson(options);
        return this.executeWrapped(fn);
    }

    //-------------------------
    // Implementation
    //--------------------------
    private executeWrapped<T>(fn: RunFunction<T>): Promise<T> {
        fn = this.wrapTrack(fn);
        fn = this.wrapLog(fn);

        const {spanConfig, ctx} = this;
        return spanConfig
            ? XH.traceService.withSpan(spanConfig, span => fn(this.getNestedCtx(span)))
            : fn(ctx);
    }

    private wrapLog<S>(fn: RunFunction<S>): RunFunction<S> {
        const {debugMsgs, infoMsgs} = this;

        if (debugMsgs != null && getLogLevel() === 'debug') {
            return ctx => withDebug(debugMsgs, () => fn(ctx), ctx.caller);
        } else if (this.infoMsgs != null) {
            return ctx => withInfo(infoMsgs, () => fn(ctx), ctx.caller);
        }
        return fn;
    }

    private wrapTrack<S>(fn: RunFunction<S>): RunFunction<S> {
        const {trackOptions} = this;
        if (!trackOptions) return fn;
        return ctx => fn(ctx).track({...trackOptions, loadSpec: ctx.loadSpec});
    }

    private getNestedCtx(span: Span): RunContext {
        const {caller, loadSpec} = this.ctx;
        const nestedCtx = {span, loadSpec: loadSpec?.cloneWithSpan(span)};
        return new RunContext(nestedCtx, caller);
    }
}
