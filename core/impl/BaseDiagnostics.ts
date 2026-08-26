/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistBase} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';
import {logDebug, logInfo} from '@xh/hoist/utils/js';

/**
 * Base for the diagnostics published by Store, Cube View, and GridModel.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export abstract class BaseDiagnostics<T extends HoistBase> {
    /**
     * Level at which each op is logged as it happens. Leave at 'debug' to stream with the rest of
     * the app's debug output, or set to 'info' to follow this object alone at any `XH.logLevel`.
     * Observable, to support UI toggles (e.g. the Hoist Inspector's Diagnostics panel).
     */
    @observable
    logLevel: 'info' | 'debug' = 'debug';

    protected owner: T;

    protected constructor(owner: T) {
        this.owner = owner;
    }

    abstract reset(): void;

    protected logOp(
        kind: string,
        op: {type: string; total: number; elapsed: number},
        detail: string
    ) {
        const msgs = [
                `${kind} ${op.type}`,
                detail,
                `total ${op.total}`,
                `${op.elapsed.toFixed(1)}ms`
            ],
            {owner} = this;

        this.logLevel === 'info' ? logInfo(msgs, owner) : logDebug(msgs, owner);
    }
}
