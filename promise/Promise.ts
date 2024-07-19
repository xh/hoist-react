/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    Thunkable,
    Exception,
    ExceptionHandlerOptions,
    TaskObserver,
    TrackOptions,
    XH
} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {castArray, isFunction, isNumber, isString} from 'lodash';

/**
 * Enhancements to the Global Promise object.
 * Merged in to definition here and implemented on the prototype below.
 */
declare global {
    interface Promise<T> {
        /**
         * Version of `then()` that wraps the callback in a MobX action, for use in a Promise chain
         * that modifies MobX observables.
         */
        thenAction(
            onFulfilled?: (value: T) => any,
            onRejected?: (reason: any) => any
        ): Promise<any>;

        /**
         * Version of `catch()` that will only catch certain exceptions.
         *
         * @param selector - closure that takes an exception and returns a boolean. May also be
         *      specified as an exception name or list of names. Only exceptions passing this
         *      selector will be handled by this method.
         * @param fn - catch handler
         */
        catchWhen(
            selector: ((e: any) => boolean) | string | string[],
            fn?: (reason: any) => any
        ): Promise<any>;

        /**
         * Version of `catch()` that passes the error onto Hoist's default exception handler for
         * convention-driven logging and alerting. Typically called last in a Promise chain.
         */
        catchDefault(options?: ExceptionHandlerOptions): Promise<any>;

        /**
         * Version of `catchDefault()` that will only catch certain exceptions.
         */
        catchDefaultWhen(
            selector: ((e: any) => boolean) | string | string[],
            options: ExceptionHandlerOptions
        ): Promise<any>;

        /**
         * Wait on a potentially async function before passing on the original value.
         * Useful when we want to block and do something on the promise chain, but do not want to
         * manipulate the values being passed through.
         *
         * @param onFulfillment - function to receive the pass-through value when ready.
         */
        tap(onFulfillment: (value: T) => any): Promise<T>;

        /**
         * Return a promise that will resolve a specified delay after this promise resolves.
         *
         * @param interval - delay in milliseconds.
         */
        wait(interval: number): Promise<T>;

        /**
         * Return a promise that will reject if this promise has not been settled after the
         * specified interval has passed.
         */
        timeout(spec: PromiseTimeoutSpec): Promise<T>;

        /**
         * Link this promise to an instance of a {@link TaskObserver}. See that class for details
         * on what it provides and how it can be used to coordinate masking and progress messages
         * on one or more async operations.
         */
        linkTo(spec: PromiseLinkSpec): Promise<T>;

        /**
         * Track a Promise (with timing) via Hoist activity tracking.
         * @param options - TrackOptions, or simply a message string.
         */
        track(options: TrackOptions | string): Promise<T>;

        /**
         * @internal
         */
        correlationId?: string;
    }
}

/**
 * Timeout interval in ms, or an object specifying the interval and an optional message to be used
 * for any exception thrown on timeout.
 */
export type PromiseTimeoutSpec = number | {interval: number; message?: string};

/**
 * TaskObserver to track execution of a Promise, or an object specifying one with an optional
 * message to show while pending and/or optional flag to skip (e.g. for conditional masking).
 */
export type PromiseLinkSpec =
    | TaskObserver
    | {observer: TaskObserver; message?: string; omit?: Thunkable<boolean>};

/**
 * Return a promise that will resolve after the specified amount of time.
 *
 * This method serves as a lightweight way to start a promise chain for any code.
 *
 * @param interval - milliseconds to delay (default 0). Note that the actual delay will be subject
 *      to the minimum delay for `setTimeout()` in the browser.
 */
export function wait<T>(interval: number = 0): Promise<T> {
    return new Promise(resolve => setTimeout(resolve, interval)) as Promise<T>;
}

/**
 * Return a promise that will resolve after a condition has been met, polling at the specified
 * interval.
 *
 * @param condition - function that should return true when condition is met
 * @param interval - milliseconds to wait between checks (default 50). Note that the actual time
 *      will be subject to the minimum delay for `setTimeout()` in the browser.
 * @param timeout - milliseconds after which the Promise should be rejected (default 5000).
 */
export function waitFor(
    condition: () => boolean,
    interval: number = 50,
    timeout: number = 5 * SECONDS
): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const resolveOnMet = () => {
            if (condition()) {
                resolve();
            } else if (olderThan(startTime, timeout)) {
                reject(Exception.timeout({interval: Date.now() - startTime}));
            } else {
                setTimeout(resolveOnMet, interval);
            }
        };
        resolveOnMet();
    });
}

/**
 * Return a promise that resolves immediately.
 * @param value - the value to be returned by the resulting Promise.
 */
export function resolve<T>(value: T = undefined): Promise<T> {
    return Promise.resolve(value) as Promise<T>;
}

/**
 * Return a promise that never resolves.
 */
export function never<T>(): Promise<T> {
    return new Promise(() => {}) as Promise<T>;
}

//--------------------------------
// Promise prototype extensions
//--------------------------------
const enhancePromise = promisePrototype => {
    Object.assign(promisePrototype, {
        thenAction(fn) {
            return this.then(action(fn));
        },

        catchWhen(selector, fn) {
            return this.catch(e => {
                this.throwIfFailsSelector(e, selector);
                return fn ? fn(e) : undefined;
            });
        },

        catchDefault(options) {
            return this.catch(e => XH.handleException(e, options));
        },

        catchDefaultWhen(selector, options) {
            return this.catch(e => {
                this.throwIfFailsSelector(e, selector);
                return XH.handleException(e, options);
            });
        },

        track(options) {
            if (!options || (isFunction(options.omit) ? options.omit() : options.omit)) return this;
            if (isString(options)) options = {message: options};

            const startTime = Date.now();
            return this.finally(() => {
                options.elapsed = Date.now() - startTime;
                XH.track({...options, correlationId: this.correlationId});
            });
        },

        tap(onFulfillment) {
            let ret = null;
            const resolveFn = data => {
                ret = data;
                return onFulfillment(data);
            };

            return this.then(resolveFn).then(() => ret);
        },

        wait(interval) {
            return this.finally(() => wait(interval));
        },

        timeout(config) {
            if (config == null) return this;
            if (isNumber(config)) config = {interval: config};
            const interval = config.interval;

            let completed = false;
            const promise = this.finally(() => (completed = true));

            const deadline = wait(interval).then(() => {
                if (!completed) {
                    throw Exception.timeout(config);
                }
            });

            return Promise.race([deadline, promise]);
        },

        linkTo(cfg) {
            if (!cfg) return this;

            if (cfg.isTaskObserver) {
                cfg = {observer: cfg};
            }

            if (cfg.observer && !(isFunction(cfg.omit) ? cfg.omit() : cfg.omit)) {
                cfg.observer.linkTo(TaskObserver.forPromise({promise: this, message: cfg.message}));
            }
            return this;
        },

        //--------------------------------
        // Implementation
        //--------------------------------
        throwIfFailsSelector(e, selector) {
            const fn = isFunction(selector) ? selector : e => castArray(selector).includes(e.name);
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
    console.debug(
        '"Native" Promise return detected as return from async function - enhancing prototype'
    );

    // @ts-ignore
    enhancePromise(asyncFnReturn.__proto__);
}
