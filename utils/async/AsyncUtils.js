/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';


/**
 * Iterate over an array and run a closure on each element - as with `Array.forEach` - but do so
 * asynchronously and with minimal waits inserted after a configurable time interval.
 *
 * Intended for long-running or compute-intensive loops that would otherwise lock up the browser
 * if run synchronously. Waiting at regular intervals minimizes blocking of user interactions,
 * allowing ongoing rendering of UI updates (e.g. load masks) and generally keeping the browser
 * event loop running.
 *
 * @param {Array} array - the collection to process.
 * @param {Function} fn - called with each element in the array.
 * @param {Object} [opts] - additional options.
 * @param {number} [opts.waitAfter] - interval in ms after which the loop should pause and wait.
 *      If the loop completes before this interval has passed, no waits will be inserted.
 * @param {number} [opts.waitFor] - wait time in ms for each pause. The default of 1ms should be
 *      sufficient to allow an event loop cycle to run.
 * @param {string?} [opts.debug] - if provided, loop will debug log basic run info on completion.
 * @returns {Promise<void>}
 */
export async function forEachAsync(array, fn, {waitAfter = 50, waitFor = 1, debug = null} = {}) {
    const initialStart = Date.now();
    let nextBreak = initialStart + waitAfter,
        waitCount = 0;

    for (let idx = 0; idx < array.length; idx++) {
        if (Date.now() > nextBreak) {
            await wait(waitFor);
            nextBreak = Date.now() + waitAfter;
            waitCount++;
        }
        fn(array[idx], idx, array);
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

//------------------------------
// Implementation
//-------------------------------
function writeDebug(debug, waitCount, initialStart) {
    if (debug) {
        console.debug(`${debug} | completed | ${waitCount} waits | ${Date.now() - initialStart}ms`);
    }
}
