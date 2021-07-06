/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {castArray, isString} from 'lodash';

/**
 * Track a function execution, logging the provided message(s) on debug with timing information in
 * a single message after the tracked function returns.
 *
 * If the function passed to this util returns a Promise, it will wait until the Promise resolves
 * or completes to finish its logging. The actual object returned by the tracked function will
 * always be returned directly to the caller.
 *
 * @param {(string[]|string)} msgs
 * @param {function} fn
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function withDebug(msgs, fn, source) {
    return loggedDo(msgs, fn, source);
}

/**
 * Log a message for debugging with standardized formatting.
 *
 * @param {(string[]|string)} msgs
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function logDebug(msgs, source) {
    return loggedDo(msgs, null, source);
}

//----------------------------------
// Implementation
//----------------------------------
function loggedDo(msgs, fn, source) {

    source = parseSource(source);
    msgs = castArray(msgs);
    const msg = msgs.join(' | ');

    // Support simple message only
    if (!fn) {
        writeLog(msg, source);
        return;
    }

    // ..otherwise a wrapped call..
    const start = Date.now();
    let ret;
    try {
        ret = fn();
    } catch (e) {
        logException(start, msg, source, e);
        throw e;
    }

    if (ret instanceof Promise) {
        ret.then(
            () => logCompletion(start, msg, source),
            (e) => logException(start, msg, source, e)
        );
    } else {
        logCompletion(start, msg, source);
    }

    return ret;
}

function parseSource(source) {
    if (isString(source)) return source;
    if (source?.displayName) return source.displayName;
    if (source?.constructor) return source.constructor.name;
    return '';
}

function writeLog(msg, source) {
    console.debug(source ? `[${source}] ${msg}` : msg);
}

function logCompletion(start, msg, source) {
    const elapsed = Date.now() - start;
    writeLog(`${msg} | ${elapsed}ms`, source);
}

function logException(start, msg, source, e)  {
    const elapsed = Date.now() - start;
    writeLog(`${msg} | failed - ${e.message || e.name || 'Unknown error'} | ${elapsed}ms`, source);
}
