/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';
import {asArray} from 'hoist/utils/JsUtils';
import {isFunction, isNumber} from 'lodash';
import RSVP from 'rsvp';


/**
 * Start a new promise chain.
 *
 * This method serves as a lightweight way to start a promise chain for any code.
 * It is useful for combining promise based calls with non-promise based calls,
 * especially when the first step may be synchronous.  In these case, we often want
 * to ensure the use of common exception, tracking, state management within a single
 * promise chain.
 *
 * Note: This method will start executing its input function only after a minimal (1ms) delay.
 * This establishes a minimal level of asynchronicity for the entire chain, and is especially
 * important if the chain contains calls to 'bindState', 'track' or 'timeout'
 *
 * @param fn, fn appropriate as an argument to 'then()'. Default to null.
 * @returns {Promise}
 */
export async function start(fn) {
    const promise = new Promise(resolve => setTimeout(resolve, 1));
    return fn ? promise.then(fn) : start;
}

/**
 * Return a promise that will resolve after the specified amount of time.
 *
 * @param, number of milliseconds to delay.
 * @return {Promise}
 */
export async function wait(interval) {
    return new Promise(resolve => setTimeout(resolve, interval));
}

/**
 * Return a promise that resolves immediately.
 * @param value
 * @return {Promise}
 */
export async function resolve(value) {
    return Promise.resolve(value);
}

/**
 * Resolve when all promises are settled.
 *
 * Inspired and implemented by RSVP.allSettled, but returns a native Promise.
 *
 * @param promises
 * @returns array of form [{state:'fufilled'|'rejected', reason:[exception or null] , value: [value or null]}]
 */
export async function allSettled(promises) {
    return new Promise((resolve, reject) => {
        RSVP.allSettled(promises).then(it => resolve(it), it => reject(it));
    });
}


//--------------------------------------------
// Promise prototype extensions
//---------------------------------------------
Object.assign(Promise.prototype, {


    /**
     * Version of catch() that will only catch certain exceptions.
     *
     * @param selector, required.  Closure that takes an exception and returns a boolean.
     * May also be specified as a list of exceptions names to be handled.
     * Only exceptions passing this selector will be handled by this method.
     * @param fn, optional. See catch()
     */
    catchWhen(selector, fn) {
        return this.catch(e => {
            this.throwIfFailsSelector(e, selector);
            return fn ? fn(e) : undefined;
        });
    },

    /**
     * Version of catch() that will invoke default application exception handling.
     * Typically called in last line in promise chain.
     *
     * @param options, optional.
     *      {
     *        title: String,
     *        message: String
     *      }
     */
    catchDefault(options) {
        return this.catch(e => XH.handleException(e, options));
    },

    /**
     * Version of catchDefault() that will only catch certain exceptions.
     *
     * @param selector, required. See catchWhen().
     * @param options, optional. See catchDefault().
     */
    catchDefaultWhen(selector, options) {
        return this.catch(e => {
            this.throwIfFailsSelector(e, selector);
            return XH.handleException(e, options);
        });
    },

    /**
     * Track a Promise.
     *
     * @param trackCfg - valid options object for TrackService.track()
     */
    track(trackCfg) {
        if (!trackCfg) return this;

        const startTime = Date.now();

        return this.catch(e => {
            trackCfg.exception = e;
            throw e;
        }).finally(() => {
            trackCfg.elapsed = Date.now() - startTime;
            XH.track(trackCfg);
        });
    },

    /**
     * Wait on a potentially asynchronous function, before passing the originally
     * received value through.
     *
     * Useful when we want to block and do something on the promise chain, but do not want to
     * manipulate the values being passed through.
     */
    tap(onFulfillment) {
        let ret = null;
        const resolveFn = (data) => {
            ret = data;
            return onFulfillment(data);
        };

        return this
            .then(resolveFn)
            .then(() => ret);
    },

    /**
     * Return a promise that will resolve a specified delay after this promise resolves.
     *
     *
     * @param interval, time in milliseconds
     */
    wait(interval) {
        return this.finally(() => wait(interval));
    },

    /**
     * Return a promise that will reject if this promise has not been settled after the specified
     * interval has passed.
     *
     * @param config, either an interval value (in ms) or an object of the form
     *       {interval: value, message: message (optional)}
     *
     */
    timeout(config) {
        if (config == null) return this;
        if (isNumber(config)) config = {interval: config};
        config.message = config.message || 'Operation timed out';

        const deadline = wait(config.interval).then(() => {throw XH.exception(config.message)});
        return Promise.race([deadline, this]);
    },


    /**
     * Bind this promise to an instance of PromiseState.
     *
     * @param state PromiseState
     */
    bind(state) {
        state.bind(this);
        return this;
    },


    //--------------------------------
    // Implementation
    //--------------------------------
    throwIfFailsSelector(e, selector) {
        const fn = isFunction(selector) ? selector : (e) => asArray(selector).includes(e.name);
        if (!fn(e)) throw e;
    }
});