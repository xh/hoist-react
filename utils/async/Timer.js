/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {MINUTES, ONE_SECOND, olderThan} from '@xh/hoist/utils/datetime';
import {wait} from '@xh/hoist/promise';
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

    CORE_INTERVAL = ONE_SECOND;

    //-------------------------
    // Mutable public properties
    //--------------------------
    runFn = null;
    interval = null;
    timeout = null;
    delay = null;
    scope = null;

    //---------------------------------------
    // State. Should be considered read-only
    //--------------------------------------
    cancelled = false;
    isRunning = false;
    lastRun = null;
    
    /**
     * Create a new Timer.
     *
     * Main entry point, to get a new, managed timer.
     *
     * The properties may also be set on the object returned directly.
     *
     * @param {function} runFn - return a promise to allow timer to block and prevent overlapping runs.
     * @param {number} interval - interval between runs, in milliseconds, if <=0 job will not run.
     * @param {number} [timeout] - timeout for action in milliseconds, null for no timeout.
     * @param {number} [delay] - initial delay, in milliseconds
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
        this.runFn = args.runFn.bind(args.scope);
        this.interval = args.interval;
        this.timeout = args.timeout;
        this.delay = args.delay;
        wait(this.delay).then(() => this.heartbeatAsync());
    }

    async heartbeatAsync() {
        if (!this.cancelled && !this.isRunning && this.intervalElapsed) {
            await this.doRunAsync();
        }
        await wait(this.CORE_INTERVAL);
        this.heartbeatAsync();
    }

    async doRunAsync() {
        this.isRunning = true;
        try {
            await this.runFn().timeout(this.timeout);
        } catch (e) {
            console.error('Error executing timer:', e);
        }
        this.isRunning = false;
        this.lastRun = new Date();
    }

    get intervalElapsed() {
        const {lastRun, interval} = this;
        return interval >= 0 && olderThan(lastRun, interval);
    }

    destroy() {
        this.cancel();
    }
}
