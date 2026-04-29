/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LoadSpec, Some, TrackOptions, XH, Span, SpanConfig, SpanSpec} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

export interface RunnerConfig {
    caller: NameSource;
    loadSpec?: LoadSpec;
    span?: Span;
}

export type RunFunction<T> = (ctx: RunContext) => Promise<T>;

export class RunContext {
    readonly caller: NameSource;
    readonly span: Span;
    readonly loadSpec: LoadSpec;

    /** @internal */
    constructor(caller: NameSource, span: Span, loadSpec: LoadSpec) {
        this.caller = caller;
        this.span = span;
        this.loadSpec = loadSpec;
    }

    child(): Runner {
        return Runner.create({caller: this.caller, span: this.span, loadSpec: this.loadSpec});
    }

    withSpan(spec: SpanSpec): Runner {
        return this.child().withSpan(spec);
    }

    fetchJson(opts: FetchOptions): Promise<any> {
        return this.child().fetchJson(opts);
    }
}

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
export class Runner {
    private ctx: RunContext;
    private spanConfig: SpanConfig = null;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private trackOptions: TrackOptions;

    static create(cfg: RunnerConfig): Runner {
        return new Runner(cfg);
    }

    private constructor(cfg: RunnerConfig) {
        this.ctx = new RunContext(cfg.caller, cfg.span, cfg.loadSpec);
    }

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a trace span within this context. */
    withSpan(spec: SpanSpec): this {
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

    //---------------------------
    // Terminal
    //---------------------------
    /** Execute an async fn with all configured observability. */
    run<T>(fn: RunFunction<T>): Promise<T> {
        fn = this.wrapTrackAndLog(fn);
        return this.execute(fn);
    }

    /** Execute an async fn with all configured observability. */
    fetchJson(options: FetchOptions): Promise<any> {
        let fn = ctx => XH.fetchJson({...options, span: ctx.span, loadSpec: ctx.loadSpec});
        fn = this.wrapTrackAndLog(fn);
        return this.execute(fn);
    }

    //------------------------------------------------------
    // Implementation
    //------------------------------------------------------
    private execute<T>(fn: RunFunction<T>): Promise<T> {
        const {spanConfig, ctx} = this;

        return spanConfig
            ? XH.traceService.withSpan({...spanConfig, parent: ctx.span}, span => {
                  return fn(new RunContext(ctx.caller, span, ctx.loadSpec?.withChildSpan(span)));
              })
            : fn(ctx);
    }

    private wrapTrackAndLog<T>(fn: RunFunction<T>): RunFunction<T> {
        const {debugMsgs, infoMsgs, trackOptions} = this;
        if (debugMsgs != null && getLogLevel() === 'debug') {
            fn = ctx => withDebug(debugMsgs, () => fn(ctx), ctx.caller);
        } else if (this.infoMsgs != null) {
            fn = ctx => withInfo(infoMsgs, () => fn(ctx), ctx.caller);
        }

        if (trackOptions) {
            fn = ctx => fn(ctx).track({...trackOptions, loadSpec: ctx.loadSpec});
        }
        return fn;
    }
}
