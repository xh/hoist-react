/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CallContext, LoadSpec, Span, SpanConfig, XH} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {NameSource} from '@xh/hoist/utils/js';
import {Runner} from './Runner';

/**
 * Context object provided to functions executed via {@link Runner}, exposing the active
 * {@link LoadSpec} or {@link Span} along with caller metadata for logging and tracing.
 *
 * This class implements CallContext and may be passed directly to methods
 * requiring/accepting one (e.g. HoistModel.loadAsync(), service calls).
 */
export class RunContext {
    private readonly ctx: CallContext;

    /** Object owning this run.  Used primarily for logging and tracing purposes.*/
    readonly caller: NameSource;

    //-------------------------------------------------------
    // CallContext interface - for passing along to methods
    //-------------------------------------------------------
    /** The span in context or null.*/
    get span(): Span {
        const {ctx} = this;
        return ctx instanceof Span ? ctx : ctx?.span;
    }

    /**
     * The LoadSpec in context, or null.
     */
    get loadSpec(): LoadSpec {
        const {ctx} = this;
        return ctx instanceof LoadSpec ? ctx : !(ctx instanceof Span) ? ctx?.loadSpec : null;
    }

    //-------------------------------------------------------
    // Extensions for fluent use within run() implementations
    //--------------------------------------------------------
    /** Create a new runner for doing an addition work chain in *this* context.*/
    runner(): Runner {
        return Runner.create(this.ctx, this.caller);
    }

    /** Create a new runner for doing an additional work chain in a *nested* context.*/
    newSpan(spec: string | SpanConfig): Runner {
        return this.runner().newSpan(spec);
    }

    /** Run additional fetch calls in this context. */
    fetch(opts: FetchOptions): Promise<any> {
        return XH.fetch({...opts, span: this.span, loadSpec: this.loadSpec});
    }

    /** Run additional fetch calls in this context. */
    fetchJson(opts: FetchOptions): Promise<any> {
        return XH.fetchJson({...opts, span: this.span, loadSpec: this.loadSpec});
    }

    /** Run additional fetch calls in this context. */
    postJson(opts: FetchOptions): Promise<any> {
        return XH.postJson({...opts, span: this.span, loadSpec: this.loadSpec});
    }

    /** Run additional fetch calls in this context. */
    putJson(opts: FetchOptions): Promise<any> {
        return XH.fetchService.putJson({...opts, span: this.span, loadSpec: this.loadSpec});
    }

    /** Run additional fetch calls in this context. */
    deleteJson(opts: FetchOptions): Promise<any> {
        return XH.fetchService.deleteJson({...opts, span: this.span, loadSpec: this.loadSpec});
    }

    //-------------------------
    // Implementation
    //--------------------------
    /** @internal -- used by Runner.*/
    constructor(ctx: CallContext, caller: NameSource) {
        this.ctx = ctx;
        this.caller = caller;
    }
}
