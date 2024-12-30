/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';

/**
 * Iterate over an iterable and run a closure on each item - as with `for ... of` - but do so
 * asynchronously and with minimal waits inserted after a configurable time interval.
 *
 * Intended for long-running or compute-intensive loops that would otherwise lock up the browser
 * if run synchronously. Waiting at regular intervals minimizes blocking of user interactions,
 * allowing ongoing rendering of UI updates (e.g. load masks) and generally keeping the browser
 * event loop running.
 *
 * Note that if the content tab is hidden (i.e. `!XH.pageIsVisible`) this loop will be executed
 * without pauses.  In this case the pauses would be unduly large due to throttling of the event
 * loop by the browser, and there is no user benefit to avoiding blocking the main thread.
 *
 * NOTE this is NOT for use cases where the `fn` arg is itself async - i.e. it does not await the
 * call to `fn` and is instead for the opposite use case, where fn is *synchronous*. If looking to
 * run an async operation over a collection, consider a simple and blocking for...of loop.
 */
export async function forEachAsync<T>(
    collection: Iterable<T>,
    fn: (val: T, idx: number, collection: Iterable<T>) => void,
    opts?: {waitAfter?: number; waitFor?: number}
) {
    const iterator = collection[Symbol.iterator]();
    let curr = iterator.next(),
        idx = 0;
    return whileAsync(
        () => !curr.done,
        () => {
            fn(curr.value, idx++, collection);
            curr = iterator.next();
        },
        opts
    );
}

/**
 * As with `forEachAsync()` above, but in the form of a `while` loop.
 * @param conditionFn - called before each iteration; return true to continue loop.
 * @param fn - called without arguments for each iteration.
 * @param opts - additional options.
 */
export async function whileAsync(
    conditionFn: () => boolean,
    fn: () => void,
    opts?: AsyncLoopOptions
) {
    const {waitAfter = 50, waitFor = 0} = opts ?? {};

    // Fallback to basic loop when doc hidden: no user benefit, and throttling causes outsize waits
    if (!XH.pageIsVisible) {
        while (conditionFn()) fn();
        return;
    }

    const initialStart = Date.now();
    let nextBreak = initialStart + waitAfter;
    while (conditionFn()) {
        if (Date.now() > nextBreak) {
            await wait(waitFor);
            nextBreak = Date.now() + waitAfter;
        }
        fn();
    }
}

export interface AsyncLoopOptions {
    /**
     * Interval in ms after which the loop should pause and wait. If the loop completes before
     * this interval has passed, no waits will be inserted. Default 50ms.
     */
    waitAfter?: number;

    /**
     * Wait time in ms for each pause. The default of 0ms should be sufficient to allow an event
     * loop cycle to run.
     */
    waitFor?: number;
}
