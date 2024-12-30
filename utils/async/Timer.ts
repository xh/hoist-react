/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {MILLISECONDS, MINUTES, olderThan} from '@xh/hoist/utils/datetime';
import {logError, logWarn, throwIf} from '@xh/hoist/utils/js';
import {isBoolean, isFinite, isFunction, isNil, isString, pull} from 'lodash';

/**
 *
 * Promise-aware recurring task timer for use by framework and applications.
 *
 * This object is designed to be robust across failing tasks, and never to re-run the task
 * simultaneously, unless in the case of a timeout. Callers can optionally specify the duration
 * of asynchronous tasks by returning a Promise from runFn.
 *
 * This object seeks to mirror the API and semantics of `Timer.groovy` from Hoist Core as closely
 * as possible. However, there are important differences due to the synchronous nature of
 * javascript. In particular, there is no support for `runImmediatelyAndBlock`, and the `timeout`
 * argument will not be able to interrupt synchronous activity of the runFn.
 *
 * All public properties should be considered read-only.
 * See `setInterval()` to change the interval of this Timer dynamically.
 */
export class Timer {
    static _timers: Timer[] = [];
    static MIN_INTERVAL_MS = 500;

    runFn: () => any = null;
    interval: number | (() => number) = null;
    timeout: number | (() => number) = null;
    delay: number | boolean = null;
    scope: any = null;
    intervalUnits: number = null;
    timeoutUnits: number = null;

    cancelled: boolean = false;
    isRunning: boolean = false;
    lastRun: Date = null;

    private warnedIntervals = new Set();

    /** Create a new Timer. */
    static create({
        runFn,
        interval,
        timeout = 3 * MINUTES,
        intervalUnits = MILLISECONDS,
        timeoutUnits = MILLISECONDS,
        delay = false,
        scope = this
    }: TimerSpec) {
        const t = new Timer({runFn, interval, timeout, intervalUnits, timeoutUnits, delay, scope});
        this._timers.push(t);
        return t;
    }

    /**
     * Permanently cancel *all* running timers.
     *
     * This method is intended for framework use only.
     * It is a one-way operation, intended for permanently halting app activity before sleeping.
     */
    static cancelAll() {
        this._timers.forEach(t => t.cancelInternal());
        this._timers = [];
    }

    /** Permanently cancel this timer. */
    cancel() {
        this.cancelInternal();
        pull(Timer._timers, this);
    }

    /**
     * Change the interval of this timer (any value `<=0` will pause the timer).
     */
    setInterval(interval: number | string) {
        this.interval = this.parseDynamicVal(interval);
    }

    //----------------------
    // Implementation
    //----------------------
    constructor(args) {
        this.runFn = args.runFn.bind(args.scope);
        this.interval = this.parseDynamicVal(args.interval);
        this.timeout = this.parseDynamicVal(args.timeout);
        this.intervalUnits = args.intervalUnits;
        this.timeoutUnits = args.timeoutUnits;
        this.delay = this.parseDelay(args.delay);
        throwIf(
            this.interval == null || this.runFn == null,
            'Missing required arguments for Timer - both interval and runFn must be specified.'
        );

        wait(this.delay).then(() => this.heartbeatAsync());
    }

    private cancelInternal() {
        this.cancelled = true;
        this.runFn = null;
    }

    private async heartbeatAsync() {
        const {cancelled, isRunning, intervalMs, lastRun} = this;
        if (!cancelled && !isRunning && intervalMs > 0 && olderThan(lastRun, intervalMs)) {
            await this.doRunAsync();
        }
        const heartBeatInterval = intervalMs > 0 && intervalMs < 2000 ? 250 : 1000;
        await wait(heartBeatInterval);
        this.heartbeatAsync();
    }

    private async doRunAsync() {
        this.isRunning = true;
        try {
            await (this.internalRunFn() as any).timeout(this.timeoutMs);
        } catch (e) {
            logError(['Error executing timer', e], this);
        }
        this.isRunning = false;
        this.lastRun = new Date();
    }

    private async internalRunFn() {
        return this.runFn(); // Wrap to ensure we return a promise.
    }

    private parseDynamicVal(val) {
        return isString(val) ? () => XH.configService.get(val) : val;
    }

    private parseDelay(val: number | boolean): number {
        if (isBoolean(val)) return val ? this.intervalMs : 0;
        return isFinite(val) ? val : 0;
    }

    private get intervalMs() {
        const {interval, intervalUnits, warnedIntervals} = this,
            min = Timer.MIN_INTERVAL_MS;

        if (isNil(interval)) return null;

        let ret = (isFunction(interval) ? interval() : interval) * intervalUnits;

        if (ret > 0 && ret < min) {
            if (!warnedIntervals.has(ret)) {
                warnedIntervals.add(ret);
                logWarn(
                    `Interval of ${ret}ms requested - forcing to min interval of ${min}ms.`,
                    this
                );
            }
            ret = min;
        }
        return ret;
    }

    private get timeoutMs() {
        const {timeout, timeoutUnits} = this;
        if (isNil(timeout)) return null;
        return (isFunction(timeout) ? timeout() : timeout) * timeoutUnits;
    }

    destroy() {
        this.cancel();
    }
}

export interface TimerSpec {
    /**
     * Function to run.
     * For async activity, return a promise to allow timer to prevent overlapping runs.
     */
    runFn: () => any;

    /**
     * Interval between runs, in milliseconds.
     * If a number and `<=0` job will not run.
     * If a function, will be re-evaluated after every timer run.
     * If a string, will be interpreted as an AppConfig key and looked up to determine the value.
     */
    interval: number | (() => number) | string;

    /**
     * Timeout for action in milliseconds.
     * Like interval, this value may also be specified as a function or a config key.
     * Set to null for no timeout.
     */
    timeout?: number | (() => number) | string;

    /** Units that the interval arg is specified in. Default is ms. */
    intervalUnits?: number;

    /** Units that the timeout arg is specified in. Default is ms. */
    timeoutUnits?: number;

    /**
     * Initial delay, in milliseconds.
     * If specified as true, the value of the delay will be the same as interval.  Default to false.
     */
    delay?: number | boolean;

    /** Scope to run runFn in. */
    scope?: any;
}
