/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Some, XH} from '@xh/hoist/core';
import {getLogLevel, NameSource, withDebug, withInfo} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import {Span, SpanConfig} from './Span';

/**
 * Composable builder for wrapping a function with tracing and logging.
 *
 * Each concern is opt-in via dedicated builder methods, then executed with {@link run}. The
 * function is wrapped according to the precedence below, regardless of the order the methods
 * are called in:
 *      span → log → user fn.
 *
 * ```typescript
 * observe(this)
 *     .span({name: 'processOrder', tags: {orderId}})
 *     .logInfo('Processing order')
 *     .run(() => {
 *         // business logic
 *     });
 * ```
 *
 * When both {@link logInfo} and {@link logDebug} are configured, the finer level is selected at
 * run time: debug if the current log level permits, otherwise info.
 *
 * @see HoistBase#observe - convenience factory for service/model callers.
 */
export class ObservedRun {
    private caller: NameSource;
    private infoMsgs: Some<unknown> = null;
    private debugMsgs: Some<unknown> = null;
    private spanConfig: SpanConfig = null;

    /**
     * Create an ObservedRun with the given caller.
     *
     * @param caller - object owning the observed work, typically a Hoist service or model. Used as
     *     the logging context for {@link logInfo} / {@link logDebug} and as the span
     *     `code.namespace` tag. May be omitted for anonymous usage.
     */
    static observe(caller?: NameSource): ObservedRun {
        return new ObservedRun(caller);
    }

    private constructor(caller?: NameSource) {
        this.caller = caller;
    }

    //---------------------------
    // Log configuration
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

    //---------------------------
    // Span configuration
    //---------------------------
    /** Configure a trace span. Caller is auto-populated from the {@link observe} caller. */
    span(config: string | SpanConfig): this {
        const cfg: SpanConfig = isString(config) ? {name: config} : {...config};
        if (this.caller && !cfg.caller) cfg.caller = this.caller;
        this.spanConfig = cfg;
        return this;
    }

    //---------------------------
    // Terminal
    //---------------------------
    /** Execute an async fn with all configured observability. */
    run<T>(fn: (span?: Span) => Promise<T>): Promise<T> {
        return this.wrapSpan(span => Promise.resolve(this.wrapLog(() => fn(span))));
    }

    //------------------------------------------------------
    // Implementation
    //------------------------------------------------------
    private wrapSpan<T>(fn: (span?: Span) => Promise<T>): Promise<T> {
        return this.spanConfig ? XH.traceService.withSpan(this.spanConfig, fn) : fn(undefined);
    }

    private wrapLog<T>(fn: () => T): T {
        if (this.debugMsgs != null && getLogLevel() === 'debug') {
            return withDebug<T>(this.debugMsgs, fn, this.caller);
        }
        if (this.infoMsgs != null) {
            return withInfo<T>(this.infoMsgs, fn, this.caller);
        }
        return fn();
    }
}
