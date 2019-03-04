/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {MINUTES} from '@xh/hoist/utils/datetime';
import {start, wait} from '@xh/hoist/promise';
import {pull, isString} from 'lodash';

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

    runFn = null;
    cancelled = false;

    intervalMs = null;
    delayMs = null;
    timeoutMs = null;

    /**
     * Create a new Timer.
     *
     * Main entry point, to get a new, managed timer.
     *
     * @param {function} runFn
     * @param {number} interval - interval between runs, in milliseconds, if <=0 job will not run.
     * @param {number} [intervalUnits] - value to multiply interval by to get millis [default 1]
     * @param {number} [delay] - initial delay, in milliseconds
     * @param {number} [delayUnits] - value to multiply delay by to get millis [default 1]
     * @param {number} [timeout] - timeout for action in milliseconds, null for no timeout.
     * @param {number} [timeoutUnits] - value to multiply timeout by to get millis [default 1]

     * @param {Object} [scope] - scope to run callback in
     */
    static create({runFn, interval, intervalUnits = 1, delay=0, delayUnits = 1, timeout=3*MINUTES, timeoutUnits = 1, scope=this}) {
        const ret = new Timer({runFn, interval, intervalUnits, delay, delayUnits, timeout, timeoutUnits, scope});
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

        args.interval = this.processConfigString(args.interval);
        args.timeout = this.processConfigString(args.timeout);
        args.delay = this.processConfigString(args.delay);

        this.intervalMs = args.interval * args.intervalUnits;
        this.timeoutMs = args.timeout * args.timeoutUnits;
        this.delayMs = args.delay * args.delayMs;

        Object.assign(this, args);
        wait(this.delayMs).then(this.doRun);
    }

    doRun = () => {
        const {cancelled, runFn, timeoutMs, intervalMs, doRun}  = this;

        if (cancelled || intervalMs <= 0) return;

        start(runFn)
            .timeout(timeoutMs)
            .catch(e => console.error('Error executing timer:', e))
            .wait(intervalMs)
            .finally(doRun);
    }

    processConfigString(arg) {
        return isString(arg) ? XH.getConf(arg) : arg;

    }

    destroy() {
        this.cancel();
    }
}