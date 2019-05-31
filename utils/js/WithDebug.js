/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {castArray, isString} from 'lodash';

/**
 * Track a function execution with debug logging and timing info.
 *
 * This function will output messages before and after the execution of the tracked function.
 *
 * If the tracked function passed to this function returns a Promise, the function will
 * wait until the Promise resolves or completes to finish its logging. In any case, the
 * actual object returned by the tracked function will be returned directly to
 * the caller.
 *
 *
 * @param {(String[]|String)} msgs
 * @param {function} fn
 * @param {(Object|String)} [source] - Class, function or string to label the source of the message
 */
export function withDebug(msgs, fn, source) {
    return loggedDo(msgs, fn, source, false);
}

/**
 * Track a function execution with debug logging and timing info.
 *
 * This function will output a single message after the tracked function completes.
 *
 * If the tracked function passed to this function returns a Promise, the function will
 * wait until the Promise resolves or completes to finish its logging. In any case, the
 * actual object returned by the tracked function will be returned directly to
 * the caller.
 *
 * @param {(String[]|String)} msgs
 * @param {function} fn
 * @param {(Object|String)} [source] - Class, function or string to label the source of the message
 */
export function withShortDebug(msgs, fn, source) {
    return loggedDo(msgs, fn, source, true);
}

//----------------------------------
// Implementation
//----------------------------------
function loggedDo(msgs, fn, source, short) {

    source = parseSource(source);
    msgs = castArray(msgs);
    const msg = msgs.join(' | ');
    if (!short) writeLog(`${msg} | started`, source);

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
    if (source && source.constructor) return source.constructor.name;
    return '';
}

function writeLog(msg, source) {
    console.debug(source ? `[${source}] ${msg}` : msg);
}

function logCompletion(start, msg, source) {
    const elapsed = Date.now() - start;
    writeLog(`${msg} | completed | ${elapsed}`, source);
}

function logException(start, msg, source, e)  {
    const elapsed = Date.now() - start;
    writeLog(`${msg} | failed - ${e.message || e.name || 'Unknown error'} | ${elapsed}`, source);
}