/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {TaskObserver, XH} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {action} from '@xh/hoist/mobx';
import {castArray, isFunction, isNumber, isString} from 'lodash';

/**
 * Return a promise that will resolve after the specified amount of time.
 *
 * This method serves as a lightweight way to start a promise chain for any code.
 *
 * @param {number} [interval] - milliseconds to delay. Defaults to 0.  Note that the actual
 *      delay will be subject to the minimum delay for setTimeout() in the browser.
 * @return {Promise}
 */
export async function wait(interval = 0) {
    return new Promise(resolve => setTimeout(resolve, interval));
}

/**
 * Return a promise that resolves immediately.
 *
 * @param {*} value - the value to be returned by the resulting Promise.
 * @return {Promise}
 */
export async function resolve(value) {
    return Promise.resolve(value);
}

/**
 * Return a promise that never resolves.
 *
 * @return {Promise}
 */
export async function never() {
    return new Promise(() => {});
}


//--------------------------------
// Promise prototype extensions
//--------------------------------
const enhancePromise = (promisePrototype) => {
    Object.assign(promisePrototype, {

        /**
         * Version of `then()` that wraps the callback in a MobX action, for use in a Promise chain
         * that modifies MobX observables.
         *
         * @memberOf Promise.prototype
         * @param {function} [fn] - function appropriate as an argument to `then()`.
         */
        thenAction(fn) {
            return this.then(action(fn));
        },

        /**
         * Version of `catch()` that will only catch certain exceptions.
         *
         * @memberOf Promise.prototype
         * @param {(function|string|string[])} selector - closure that takes an exception and
         *      returns a boolean. May also be specified as an exception name or list of names.
         *      Only exceptions passing this selector will be handled by this method.
         * @param {function} [fn]
         */
        catchWhen(selector, fn) {
            return this.catch(e => {
                this.throwIfFailsSelector(e, selector);
                return fn ? fn(e) : undefined;
            });
        },

        /**
         * Version of `catch()` that passes the error onto Hoist's default exception handler for
         * convention-driven logging and alerting. Typically called last in a Promise chain.
         *
         * @memberOf Promise.prototype
         * @param {Object} [options] - valid options for {@see XH.handleException()}.
         */
        catchDefault(options) {
            return this.catch(e => XH.handleException(e, options));
        },

        /**
         * Version of `catchDefault()` that will only catch certain exceptions.
         *
         * @memberOf Promise.prototype
         * @param {(function|string|string[])} selector - see catchWhen().
         * @param {Object} [options] - valid options for {@see XH.handleException()}.
         */
        catchDefaultWhen(selector, options) {
            return this.catch(e => {
                this.throwIfFailsSelector(e, selector);
                return XH.handleException(e, options);
            });
        },

        /**
         * Track a Promise (with timing) via Hoist activity tracking.
         *
         * @memberOf Promise.prototype
         * @param {(Object|string)} options - valid options for {@see TrackService.track()}
         * @param {string} [options.message]
         * @param {string} [options.category]
         * @param {(Object|Object[])} [options.data]
         * @param {string} [options.severity]
         * @param {boolean} [options.oncePerSession]
         * @param {LoadSpec} [options.loadSpec]
         * @param {boolean} [options.omit]
         */
        track(options) {
            if (!options || options.omit) return this;
            if (isString(options)) options = {message: options};

            const startTime = Date.now();
            return this.finally(() => {
                options.elapsed = Date.now() - startTime;
                XH.track(options);
            });
        },

        /**
         * Wait on a potentially async function before passing on the original value.
         * Useful when we want to block and do something on the promise chain, but do not want to
         * manipulate the values being passed through.
         *
         * @memberOf Promise.prototype
         * @param {function} onFulfillment - function to receive the pass-through value when ready.
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
         * @param {number} interval - delay in milliseconds.
         */
        wait(interval) {
            return this.finally(() => wait(interval));
        },

        /**
         * Return a promise that will reject if this promise has not been settled after the
         * specified interval has passed.
         *
         * @memberOf Promise.prototype
         * @param {(Object|number)} [config] - object as per below, or interval in ms (if number).
         *      If null, no timeout enforced.
         * @param {number} [config.interval] - interval value in ms.
         * @param {string} [config.message] - custom message for Exception thrown on timeout.
         */
        timeout(config) {
            if (config == null) return this;
            if (isNumber(config)) config = {interval: config};
            const interval = config.interval;

            let completed = false;
            const promise = this.finally(() => completed = true);

            const deadline = wait(interval).then(() => {
                if (!completed) {
                    throw Exception.timeout(config);
                }
            });

            return Promise.race([deadline, promise]);
        },


        /**
         * Link this promise to an instance of a {@see TaskObserver}. See that class for details
         * on what it provides and how it can be used to coordinate masking and progress messages
         * on one or more async operations.
         *
         * @memberOf Promise.prototype
         * @param {Object|TaskObserver} cfg - TaskObserver to use to track execution of this
         *      Promise, or a config with observer + additional options.
         * @param {TaskObserver} cfg.observer
         * @param {string} [cfg.message] - optional message to display while pending.
         * @param {boolean} [cfg.omit] - optional flag to indicate linkage should be skipped
         *      If true, this method is no-op.  Provided as convenience for conditional masking.
         */
        linkTo(cfg) {
            if (!cfg) return this;

            if (cfg.isTaskObserver) {
                cfg = {observer: cfg};
            }

            if (cfg.observer && !cfg.omit) {
                cfg.observer.linkTo(TaskObserver.forPromise({promise: this, message: cfg.message}));
            }
            return this;
        },

        //--------------------------------
        // Implementation
        //--------------------------------
        throwIfFailsSelector(e, selector) {
            const fn = isFunction(selector) ? selector : (e) => castArray(selector).includes(e.name);
            if (!fn(e)) throw e;
        }
    });
};

// Enhance canonical Promises.
enhancePromise(Promise.prototype);

// MS Edge returns a "native Promise" from async functions that won't get the enhancements above.
// Check to see if we're in such an environment and enhance that prototype as well.
// @see https://github.com/xh/hoist-react/issues/1411
const asyncFnReturn = (async () => {})();
if (!(asyncFnReturn instanceof Promise)) {
    console.debug('"Native" Promise return detected as return from async function - enhancing prototype');
    enhancePromise(asyncFnReturn.__proto__);
}
