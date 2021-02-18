/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {wait} from '@xh/hoist/promise';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {Timer} from '../../utils/async/Timer';

/**
 * Iterate over a collection and run a closure on each item - as with `for ... of` - but do so
 * asynchronously and with minimal waits inserted after a configurable time interval.
 *
 * Intended for long-running or compute-intensive loops that would otherwise lock up the browser
 * if run synchronously. Waiting at regular intervals minimizes blocking of user interactions,
 * allowing ongoing rendering of UI updates (e.g. load masks) and generally keeping the browser
 * event loop running.
 *
 * NOTE this is NOT for use cases where the `fn` arg is itself async - i.e. it does not await the
 * call to `fn` and is instead for the opposite use case, where fn is *synchronous*. If looking to
 * run an async operation over a collection, consider a for...of loop as per implementation below.
 *
 * @param {Iterable} collection - items to iterate over
 * @param {Function} fn - called with each item.
 * @param {Object} [opts] - additional options.
 * @param {number} [opts.waitAfter] - interval in ms after which the loop should pause and wait.
 *      If the loop completes before this interval has passed, no waits will be inserted.
 * @param {number} [opts.waitFor] - wait time in ms for each pause. The default of 1ms should be
 *      sufficient to allow an event loop cycle to run.
 * @param {string?} [opts.debug] - if provided, loop will debug log basic run info on completion.
 * @returns {Promise<void>}
 */
export async function forEachAsync(collection, fn, {waitAfter = 50, waitFor = 1, debug = null} = {}) {
    const initialStart = Date.now();
    let nextBreak = initialStart + waitAfter,
        waitCount = 0;

    let idx = 0;
    for (const item of collection) {
        if (Date.now() > nextBreak) {
            await wait(waitFor);
            nextBreak = Date.now() + waitAfter;
            waitCount++;
        }
        fn(item, idx++, collection);
    }

    writeDebug(debug, waitCount, initialStart);
}

/**
 * As with `forEachAsync()` above, but in the form of a `while` loop.
 * @param {function} conditionFn - called before each iteration; return true to continue loop.
 * @param {function} fn - called without arguments for each iteration.
 * @param {Object} [opts] - additional options.
 * @param {number} [opts.waitAfter] - interval in ms after which the loop should pause and wait.
 *      If the loop completes before this interval has passed, no waits will be inserted.
 * @param {number} [opts.waitFor] - wait time in ms for each pause. The default of 1ms should be
 *      sufficient to allow an event loop cycle to run.
 * @param {string?} [opts.debug] - if provided, loop will debug log basic run info on completion.
 * @returns {Promise<void>}
 */
export async function whileAsync(conditionFn, fn, {waitAfter = 50, waitFor = 1, debug = null} = {}) {
    const initialStart = Date.now();
    let nextBreak = initialStart + waitAfter,
        waitCount = 0;

    while (conditionFn()) {
        if (Date.now() > nextBreak) {
            await wait(waitFor);
            nextBreak = Date.now() + waitAfter;
            waitCount++;
        }
        fn();
    }
    writeDebug(debug, waitCount, initialStart);
}


/**
 * Evaluate runFn on interval until it returns true, or until timeout is expired.
 * Use this to wait for a state that you expect to eventually be true.
 * @param {Object} [opts] - options.
 * @param {function} [opts.runFn] - Function to run each iteration.  May be async.  Must return boolean.
 * @param {number} [opts.interval] - Interval in ms to wait for each iteration.
 * @param {string} [opts.failMsg] - Message to put into Exception when the loop timeout expires.
 * @param {number} [opts.timeout] - Duration in ms after which the iterations will stop and exception will be thrown.
 *                                  Also the duration to wait for a result of a run of the runFn, if the runFn is a Promise.
 */
export async function isReadyAsync({
    runFn,
    interval = 500,
    failMsg,
    timeout = 30 * SECONDS,
    debug = false
}) {
    let ret, runner;
        
    try {
        ret = await new Promise((resolve, reject) => {
            const internalRunFnAsync = async () => {
                if (await runFn()) {
                    resolve(true);
                } else if (debug) {
                    console.warn('runFn passed to isReadyAsync returned false. Retrying.');
                }
            };  

            runner = Timer.create({
                runFn: internalRunFnAsync,
                interval,
                timeout
            });

        }).timeout({
            interval: timeout,
            message: failMsg
        });
    } catch (error) {
        ret = false;
        console.error(error);
    }

    runner.cancel();
    return ret;
}


//------------------------------
// Implementation
//-------------------------------
function writeDebug(debug, waitCount, initialStart) {
    if (debug) {
        console.debug(`${debug} | completed | ${waitCount} waits | ${Date.now() - initialStart}ms`);
    }
}
