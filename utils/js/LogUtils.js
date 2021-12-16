/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {castArray, isString} from 'lodash';
import {apiDeprecated} from './LangUtils';

/**
 * Track a function execution with console.log.
 *
 * This method will log the provided message(s) with timing information in a single message *after*
 * the tracked function returns.
 *
 * If the function passed to this util returns a Promise, it will wait until the Promise resolves
 * or completes to finish its logging. The actual object returned by the tracked function will
 * always be returned directly to the caller.
 *
 * @param {(string[]|string)} msgs
 * @param {function} fn
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function withInfo(msgs, fn, source) {
    return loggedDo(msgs, fn, source, 'info');
}

/**
 * Track a function execution with console.debug.
 * @see withInfo
 *
 * @param {(string[]|string)} msgs
 * @param {function} fn
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function withDebug(msgs, fn, source) {
    return loggedDo(msgs, fn, source, 'debug');
}

/**
 * Log a message with console.log.
 *
 * @param {(string[]|string)} msgs
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function logInfo(msgs, source) {
    return loggedDo(msgs, null, source, 'info');
}

/**
 * Log a message with console.debug.
 *
 * @param {(string[]|string)} msgs
 * @param {(Object|string)} [source] - class, function or string to label the source of the message
 */
export function logDebug(msgs, source) {
    return loggedDo(msgs, null, source, 'debug');
}

/** @deprecated */
export function withShortDebug(msgs, fn, source) {
    apiDeprecated('withShortDebug', {msg: 'Use withDebug() instead', v: 'v45'});
    return withDebug(msgs, fn, source);
}


//----------------------------------
// Implementation
//----------------------------------
function loggedDo(msgs, fn, source, level) {
    source = parseSource(source);
    msgs = castArray(msgs);
    const msg = msgs.join(' | ');

    // Support simple message only.
    if (!fn) {
        writeLog(msg, source, level);
        return;
    }

    // Otherwise, wrap the call to the provided fn.
    let start, ret;
    const logCompletion = () => {
            const elapsed = Date.now() - start;
            writeLog(`${msg} | ${elapsed}ms`, source, level);
        },
        logException =  (e) => {
            const elapsed = Date.now() - start;
            writeLog(`${msg} | failed - ${e.message ?? e.name ?? 'Unknown error'} | ${elapsed}ms`, source, level);
        };

    start = Date.now();
    try {
        ret = fn();
    } catch (e) {
        logException(e);
        throw e;
    }

    if (ret instanceof Promise) {
        ret.then(logCompletion, logException);
    } else {
        logCompletion();
    }

    return ret;
}

function parseSource(source) {
    if (isString(source)) return source;
    if (source?.displayName) return source.displayName;
    if (source?.constructor) return source.constructor.name;
    return '';
}

function writeLog(msg, source, level) {
    if (source) msg = `[${source}] ${msg}`;
    level === 'info' ? console.log(msg) : console.debug(msg);
}
