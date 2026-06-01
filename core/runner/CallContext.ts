/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {LoadSpec} from '../load/LoadSpec';
import type {Span} from '../Span';
import type {CallContextLike} from '../types/Interfaces';

/**
 * Normalized, framework-internal call context — carries tracing/load state across call boundaries.
 *
 * Built from a {@link CallContextLike} input at framework entry points (e.g. `HoistBase.runner`,
 * `FetchService.fetchInternalAsync`).
 *
 * Apps typically don't construct this directly - pass a {@link CallContextLike} literal (e.g.
 * `{loadSpec}`) to the framework and let it wrap.
 */
export class CallContext implements CallContextLike {
    readonly span: Span | null;
    readonly loadSpec: LoadSpec | null;

    constructor(spec: CallContextLike) {
        this.loadSpec = spec?.loadSpec ?? null;
        this.span = spec?.span ?? spec?.loadSpec?.span ?? null;
    }

    /**
     * Return a new nested {@link CallContext} with a nested span.
     *
     * @internal -- applications looking to create a span should use
     * Runner.span() or 'TraceService.withSpan' instead.
     */
    cloneWithSpan(span: Span): CallContext {
        return new CallContext({span, loadSpec: this.loadSpec?.cloneWithSpan(span)});
    }
}
