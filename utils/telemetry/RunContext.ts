/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {LoadSpec, LoadSpecConfig, Span, SpanConfigLike} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';
import {Runner} from './Runner';
import {NameSource} from '@xh/hoist/utils/js';

export class RunContext {
    private readonly ctx: LoadSpec | Span;

    /** Object owning this run.  Used primarily for logging and tracing purposes.*/
    readonly caller: NameSource;

    /** The span in context or null.*/
    get span(): Span {
        return this.loadSpec.span;
    }

    /**
     * The LoadSpec in context, or an appropriate configuration to start a new one.
     *
     * If the runner producing this object is in doLoadAsync, this will be
     * a concrete LoadSpec, with full info about the existing loading lifecycle.
     * Otherwise, it will be an appropriate LoadSpecConfig for starting a new load.
     */
    get loadSpec(): LoadSpecConfig {
        const {ctx} = this;
        return ctx instanceof LoadSpec ? ctx : {span: ctx};
    }

    /**
     * Create a new runner for doing additional work in this context.
     */
    runner(): Runner {
        return Runner.create(this.ctx, this.caller);
    }

    /** Create a new runner for doing addition work in a nested context.*/
    newSpan(spec: SpanConfigLike): Runner {
        return this.runner().newSpan(spec);
    }

    /** Run additional fetch calls in this context. */
    fetchJson(opts: FetchOptions): Promise<any> {
        return this.runner().fetchJson(opts);
    }

    /** Run additional fetch calls in this context. */
    postJson(opts: FetchOptions): Promise<any> {
        return this.runner().postJson(opts);
    }

    //-------------------------
    // Implementation
    //--------------------------

    /** @internal -- used by Runner.*/
    constructor(ctx: LoadSpec | Span, caller: NameSource) {
        this.ctx = ctx;
        this.caller = caller;
    }

    /** @internal -- used by Runner.*/
    cloneWithSpan(span: Span) {
        const {ctx} = this,
            newCtx = ctx instanceof LoadSpec ? ctx.cloneWithSpan(span) : span;
        return new RunContext(newCtx, this.caller);
    }
}
