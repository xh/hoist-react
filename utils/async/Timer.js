/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {MINUTES, ONE_SECOND} from '@xh/hoist/utils/datetime';
import {start, wait} from '@xh/hoist/promise';
import {pull, isFunction} from 'lodash';

/**
 *
 * Promise-aware recurring task timer for use by framework and applications.
 *
 * This object is designed to be robust across failing tasks, and never to re-run the task
 * simultaneously, unless in the case of a timeout.  Callers can optionally specify
 * the duration of asynchronous tasks by returning a Promise from runFn.
 *
 * This object seeks to mirror the API and semantics of the server-side equivalent 'Timer'
 * as closely as possible. However there are important  differences due to the synchronous
 * nature of javascript.  In particular, there is no support for 'runImmediatelyAndBlock'
 * and the 'timeout' argument will not be able to interrupt synchronous activity of the runFn.
 */
export class Timer {

    static _timers = [];

    CORE_INTERVAL = ONE_SECOND;

    runFn = null;
    cancelled = false;

    isRunning = false;
    lastRun = null;

    interval = null;
    timeout = null;
    delay = null;

    /**
     * Create a new Timer.
     *
     * Main entry point, to get a new, managed timer.
     * The interval, delay, and timeout params can receive closures, allowing support for XH configs and prefs.
     *
     * @param {function} runFn
     * @param {number|function} interval - interval between runs, in milliseconds, if <=0 job will not run.
     * @param {number|function} [delay] - initial delay, in milliseconds
     * @param {number|function} [timeout] - timeout for action in milliseconds, null for no timeout.

     * @param {Object} [scope] - scope to run callback in
     */
    static create({runFn, interval, delay=0, timeout=3*MINUTES, scope=this}) {
        const ret = new Timer({runFn, interval, delay, timeout, scope});
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
        this._timers.forEach(t => t.cancel());
        this._timers = [];
    }

    /**
     * Permanently cancel this timer.
     */
    cancel() {
        this.cancelled = true;
        this.runFn = null;
        pull(Timer._timers, this);
    }


    //----------------------
    // Implementation
    //----------------------
    constructor(args) {
        args.runFn = args.runFn.bind(args.scope);
        Object.assign(this, args);

        this.interval = args.interval;
        this.timeout = args.timeout;
        this.delay = args.delay;

        wait(this.delay).then(this.doRun);
    }

    doRun = () => {
        const {cancelled, doRun} = this;

        if (cancelled) return;

        start(this.onCoreTimer)
            .wait(this.CORE_INTERVAL)
            .finally(doRun);
    }

    onCoreTimer = () => {
        const {isRunning, intervalElapsed, timeoutVal, runFn} = this;

        if (!isRunning && intervalElapsed) {
            this.isRunning = true;
            start(runFn)
                .timeout(timeoutVal)
                .catch(e => console.error('Error executing timer:', e))
                .finally(() => {
                    this.isRunning = false;
                    this.lastRun = new Date();
                });
        }
    }

    get intervalElapsed() {
        const {lastRun, intervalVal} = this,
            now = new Date();

        return intervalVal >= 0 &&
            (!lastRun || now.getTime() > lastRun.getTime() + intervalVal);
    }

    get intervalVal() {
        return this.getVal(this.interval);
    }

    get timeoutVal() {
        return this.getVal(this.timeout);
    }

    getVal(arg) {
        return isFunction(arg) ? arg() : arg;
    }

    destroy() {
        this.cancel();
    }
}
