/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {runWhenIdle} from '@xh/hoist/utils/async';

export interface DeferredWorkSchedulerConfig {
    /** Work to run - measured to pace subsequent runs. */
    runFn: () => Promise<void> | void;

    /** Ceiling (ms) on the pacing floor and idle wait combined - see `GridModel.MAX_DEFERRED_SORT`. */
    maxDeferral: number;

    /** Multiple of the last run's cost to wait before the next - read fresh on each run. */
    factorFn: () => number;
}

/**
 * Paces recurring, deferrable grid work off its own measured cost, bounding it to a fraction of
 * main-thread time so a streaming grid cannot spend every tick re-running it.
 *
 * Scheduled work lands in two stages - a pacing floor derived from the last run's cost, then
 * placement at the browser's next idle moment - with `maxDeferral` bounding the two combined, so
 * a busy main thread cannot defer it indefinitely.
 *
 * @internal
 */
export class DeferredWorkScheduler extends HoistBase {
    private readonly runFn: () => Promise<void> | void;
    private readonly maxDeferral: number;
    private readonly factorFn: () => number;

    private queued = false;

    // Earliest performance.now() at which the next run may start - set from the last run's cost.
    private nextAllowed = 0;

    constructor({runFn, maxDeferral, factorFn}: DeferredWorkSchedulerConfig) {
        super();
        this.runFn = runFn;
        this.maxDeferral = maxDeferral;
        this.factorFn = factorFn;
    }

    /** Queue a deferred run, unless one is already pending. */
    async scheduleAsync() {
        if (this.queued) return;
        this.queued = true;

        const deadline = performance.now() + this.maxDeferral,
            floor = this.nextAllowed - performance.now();
        if (floor > 0) await wait(floor);
        runWhenIdle(
            () => {
                this.queued = false;
                this.runNow();
            },
            {timeout: Math.max(1, deadline - performance.now())}
        );
    }

    /** Run immediately, bypassing the pacing floor - still measured to pace what follows. */
    runNow() {
        if (this.isDestroyed) return;
        const start = performance.now(),
            ret = this.runFn();
        // Note cost synchronously for sync work, so a run scheduled in the interim sees the floor.
        if (ret instanceof Promise) {
            ret.then(() => this.noteCost(start));
        } else {
            this.noteCost(start);
        }
    }

    /** Clear the pacing floor, so the next run is not held back by the last one's cost. */
    clearBackoff() {
        this.nextAllowed = 0;
    }

    private noteCost(start: number) {
        const elapsed = performance.now() - start;
        this.nextAllowed =
            performance.now() + Math.min(elapsed * this.factorFn(), this.maxDeferral);
    }
}
