/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {olderThan, MILLISECONDS, SECONDS, ONE_SECOND} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {pull, isNil, isFunction, isBoolean, isString} from 'lodash';

/**
 *
 * Promise-aware recurring task timer for use by framework and applications.
 *
 * This object is designed to be robust across failing tasks, and never to re-run the task
 * simultaneously, unless in the case of a timeout.  Callers can optionally specify
 * the duration of asynchronous tasks by returning a Promise from runFn.
 *
 * This object seeks to mirror the API and semantics of the server-side equivalent 'Timer'
 * as closely as possible. However there are important differences due to the synchronous
 * nature of javascript.  In particular, there is no support for 'runImmediatelyAndBlock'
 * and the 'timeout' argument will not be able to interrupt synchronous activity of the runFn.
 *
 * All public properties should be considered read-only.  See setInterval() to change
 * the interval of this timer dynamically.
 */
export class Timer {

    static _timers = [];

    runFn = null;
    interval = null;
    timeout = null;
    delay = null;
    scope = null;

    cancelled = false;
    isRunning = false;
    lastRun = null;

    /**
     * Create a new Timer.
     *
     * Main entry point, to get a new, managed timer.
     *
     * @param {function} runFn - return a promise to allow timer to block and prevent overlapping runs.
     * @param {(number|function|string)} interval - interval between runs, in milliseconds.
     *      if <=0 job will not run.  If specified as a function, will be re-evaluated after every
     *      timer run.  If specified as a string, value will be assumed to be a config, and will be
     *      looked up before every run.
     * @param {(number|function|string)} [timeout] - timeout for action in milliseconds.
     *      Like interval, this value may be specified as a function or a config key.
     *      Set to null for no timeout.
     * @param {number} intervalUnits -- units that the interval arg is specified in. Default is ms.
     * @param {number} timeoutUnits -- units that the timeout arg is specified in. Default is ms.
     * @param {(number|boolean)} [delay] - initial delay, in milliseconds.  If specified as true,
     *      the value of the delay will be the same as interval.  Default to false.
     * @param {Object} [scope] - scope to run callback in
     */
    static create({
        runFn,
        interval,
        timeout = 3000,
        intervalUnits = MILLISECONDS,
        timeoutUnits = MILLISECONDS,
        delay = false,
        scope = this
    }) {
        const ret = new Timer({
            runFn, interval, timeout, intervalUnits, timeoutUnits, delay, scope
        });
        this._timers.push(ret);
        return ret;
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

    /**
     * Permanently cancel this timer.
     */
    cancel() {
        this.cancelInternal();
        pull(Timer._timers, this);
    }

    /**
     * Change the interval of this timer.
     *
     * @param {number} interval between runs, in milliseconds. if <=0 job will not run.
     */
    setInterval(interval) {
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
        throwIf(this.interval == null ||  this.runFn == null, 'Missing req arguments for Timer');

        wait(this.delay).then(() => this.heartbeatAsync());
    }

    cancelInternal() {
        this.cancelled = true;
        this.runFn = null;
    }

    async heartbeatAsync() {
        const {cancelled, isRunning, intervalMs, lastRun} = this;
        if (!cancelled && !isRunning && intervalMs > 0 && olderThan(lastRun, intervalMs)) {
            await this.doRunAsync();
        }
        await wait((intervalMs > 2 * SECONDS) ? ONE_SECOND : 250);
        this.heartbeatAsync();
    }

    async doRunAsync() {
        this.isRunning = true;
        try {
            await this.internalRunFn().timeout(this.timeoutMs);
        } catch (e) {
            console.error('Error executing timer:', e);
        }
        this.isRunning = false;
        this.lastRun = new Date();
    }

    async internalRunFn() {
        return this.runFn(); // Wrap to ensure we return a promise.
    }

    parseDynamicVal(val) {
        return isString(val) ? () => XH.configService.get(val) : val;
    }

    parseDelay(val) {
        if (isBoolean(val)) return val ? this.intervalMs : 0;
        return isFinite(val) ? val : 0;
    }

    get intervalMs() {
        const {interval, intervalUnits} = this;
        if (isNil(interval)) return null;
        const ret = (isFunction(interval) ? interval() : interval) * intervalUnits;
        throwIf(ret > 0 && ret < 500, 'Object not appropriate for intervals < 500ms.');
        return interval;
    }

    get timeoutMs() {
        const {timeout, timeoutUnits} = this;
        if (isNil(timeout)) return null;
        return (isFunction(timeout) ? timeout() : timeout) * timeoutUnits;
    }

    destroy() {
        this.cancel();
    }
}
