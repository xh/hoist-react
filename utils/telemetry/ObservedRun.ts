/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LoadSpec, Some, TrackOptions, XH} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import {Span, SpanConfig, SpanSpec} from './Span';

export interface RunContext {
    caller: NameSource;
    loadSpec?: LoadSpec;
    span?: Span;
}

export type RunFunction<T> = (ctx: RunContext, childRes) => Promise<T>;

/**
 * Composable builder for wrapping a function with tracing and logging.
 *
 * Each concern is opt-in via dedicated builder methods, then executed with {@link run}. The
 * function is wrapped according to the precedence below, regardless of the order the methods
 * are called in:
 *      span → log → user fn.
 *
 * When both {@link logInfo} and {@link logDebug} are configured, the finer level is selected at
 * run time: debug if the current log level permits, otherwise info.
 *
 * @see HoistBase#observe - convenience factory for service/model callers.
 */
export class ObservedRun {
    private ctx: RunContext
    private spanConfig: SpanConfig = null;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private trackOptions: TrackOptions;
    private children: Array<(child: ObservedRun) => any>;

    static observe(context: RunContext): ObservedRun {
        return new ObservedRun(context);
    }

    private constructor(context: RunContext) {
        this.ctx = {...context};
    }

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a trace span within this context. */
    span(spec: SpanSpec): this {
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

    /**
     * Track via Hoist activity tracking.
     */
    track(opts: TrackOptions | string): this {
        this.trackOptions = isString(opts) ? {message: opts} : opts;
        return this;
    }


    /**
     * Add a child object to be run before terminating this span.
     * All children added to this object will be run in parallel before
     * calling the closure passed to the terminal method (typically run).
     * @param fn
     */
    withChild(fn: (child: ObservedRun) => Promise<any>) {
        this.children.push(fn);
        return this;
    }

    //---------------------------
    // Terminal
    //---------------------------
    /** Execute an async fn with all configured observability. */
    run<T>(fn: RunFunction<T>): Promise<T> {
        fn = this.wrapWithChildren(fn);
        fn = this.wrapTrackAndLog(fn);
        return this.execute(fn);
    }

    /** Execute an async fn with all configured observability. */
    fetchJson(options: FetchOptions): Promise<any> {
        let fn = (ctx) => XH.fetchJson({...options, span: ctx.span, loadSpec: ctx.loadSpec});
        fn = this.wrapWithChildren(fn);
        fn = this.wrapTrackAndLog(fn)
        return this.execute(fn);
    }

    //------------------------------------------------------
    // Implementation
    //------------------------------------------------------
    private execute<T>(fn: RunFunction<T>): Promise<T> {
        const {spanConfig, ctx} = this;
        return spanConfig ?
            XH.traceService.withSpan({...spanConfig, parent: ctx.span}, (span) => {
                ctx.span = span;
                ctx.loadSpec = ctx.loadSpec?.withChildSpan(span);
                return fn(ctx);
            }) :
            fn(ctx);
    }

    private wrapTrackAndLog<T>(fn: RunFunction<T>): RunFunction<T>  {
        const {debugMsgs, infoMsgs, trackOptions} = this;
        if (debugMsgs != null && getLogLevel() === 'debug') {
            fn = (ctx) => withDebug(debugMsgs, () => fn(ctx), ctx.caller)
        } else if (this.infoMsgs != null) {
            fn = (ctx) => withInfo(infoMsgs, () => fn(ctx), ctx.caller);
        }

        if (trackOptions) {
            fn = (ctx) => fn(ctx).track({...trackOptions, loadSpec: ctx.loadSpec})
        }
        return fn;
    }

    private wrapWithChildren<T>(fn: RunFunction<T>): RunFunction<T>  {
        if (children)
        fn  = (ctx) => {
                const tasks = this.children.map(child => child(new ObservedRun(ctx)));
                this.childResults = Promise.all(results);
            }
        }
    }
}
