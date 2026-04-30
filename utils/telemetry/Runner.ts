/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LoadSpec, Some, TrackOptions, XH, Span, SpanConfig, SpanConfigLike} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import {RunContext} from './RunContext';

export type RunFunction<T> = (ctx: RunContext) => Promise<T>;

export class Runner {
    private readonly ctx: RunContext;
    private readonly caller: NameSource;

    private spanConfig: SpanConfig = null;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private trackOptions: TrackOptions;

    static create(target: LoadSpec | Span, caller: NameSource) {
        return new Runner(target, caller);
    }

    constructor(target: LoadSpec | Span, caller: NameSource) {
        this.ctx = new RunContext(target, caller);
    }

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a new trace span within this context. */
    newSpan(spec: SpanConfigLike): this {
        this.spanConfig = isString(spec) ? {name: spec} : spec;
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
        return this.execute(fn);
    }

    fetchJson(options: FetchOptions): Promise<any> {
        let fn = ctx =>
            XH.fetchService.fetchJson({...options, span: ctx.span, loadSpec: ctx.loadSpec});
        return this.execute(fn);
    }

    postJson(options: FetchOptions): Promise<any> {
        let fn = ctx =>
            XH.fetchService.postJson({...options, span: ctx.span, loadSpec: ctx.loadSpec});
        return this.execute(fn);
    }

    //-------------------------
    // Implementation
    //--------------------------
    private execute<T>(fn: RunFunction<T>): Promise<T> {
        fn = this.wrapTrack(fn);
        fn = this.wrapLog(fn);

        const {spanConfig, ctx} = this;

        return spanConfig
            ? XH.traceService.withSpan({...spanConfig, parent: ctx.span}, span => {
                  return fn(ctx.cloneWithSpan(span));
              })
            : fn(ctx);
    }

    private wrapLog<S>(fn: RunFunction<S>): RunFunction<S> {
        const {debugMsgs, infoMsgs, caller} = this;

        if (debugMsgs != null && getLogLevel() === 'debug') {
            return ctx => withDebug(debugMsgs, () => fn(ctx), caller);
        } else if (this.infoMsgs != null) {
            return ctx => withInfo(infoMsgs, () => fn(ctx), caller);
        }
        return fn;
    }

    private wrapTrack<S>(fn: RunFunction<S>): RunFunction<S> {
        const {trackOptions} = this;
        if (!trackOptions) return fn;
        return ctx => fn(ctx).track({...trackOptions, loadSpec: ctx.loadSpec});
    }
}
