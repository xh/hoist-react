/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */
import {MINUTES} from 'hoist/utils/DateTimeUtils';
import {start, wait} from 'hoist/promise';
import {pull} from 'lodash';

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
    interval = null;
    delay = null;
    timeout = null;
    cancelled = false;

    /**
     * Create a new Timer.
     *
     * Main entry point, to get a new, managed timer.
     *
     * @param runFn
     * @param interval, interval between runs, in milliseconds, if <=0 job will not run.
     * @param delay, initial delay, in milliseconds
     * @param timeout, timeout for action in milliseconds, null for no timeout.
     * @param scope, scope to run callback in (optional)
     */
    static create({runFn, interval, delay=0, timeout=3*MINUTES, scope=this}) {
        const ret = new Timer({runFn, interval, delay, timeout, scope});
        this._timers.push(ret);
        return ret;
    }

    /**
     * Permanently cancel *all* running timers.
     *
     * This method is intended for framework use only.  It is a
     * one-way operation, intended for permananently halting app
     * activity before sleeping.
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
        wait(this.delay).then(this.doRun);
    }

    doRun = () => {
        const {cancelled, runFn, timeout, interval, doRun}  = this;

        if (cancelled || interval <= 0) return;

        start(runFn)
            .timeout(timeout)
            .catch(e => console.error('Error executing timer:', e))
            .wait(interval)
            .finally(doRun);
    }
}