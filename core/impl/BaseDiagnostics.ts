/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistBase} from '@xh/hoist/core';
import {logInfo} from '@xh/hoist/utils/js';

/**
 * Base for the diagnostics published by Store, Cube View, and GridModel.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export abstract class BaseDiagnostics {
    protected owner: HoistBase;
    protected loggingEnabled = false;

    constructor(owner: HoistBase) {
        this.owner = owner;
    }

    startLogging() {
        this.loggingEnabled = true;
    }

    stopLogging() {
        this.loggingEnabled = false;
    }

    abstract reset(): void;

    protected logOp(
        kind: string,
        op: {type: string; total: number; elapsed: number},
        detail: string
    ) {
        if (!this.loggingEnabled) return;
        logInfo(
            [`${kind} ${op.type}`, detail, `total ${op.total}`, `${op.elapsed.toFixed(2)}ms`],
            this.owner
        );
    }
}
