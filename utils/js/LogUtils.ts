/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {Some} from '@xh/hoist/core';
import {castArray, isString} from 'lodash';

/**
 * Time and log execution of a function to `console.info()`.
 *
 * This method will log the provided message(s) with timing information in a single message *after*
 * the tracked function returns.
 *
 * If the function passed to this util returns a Promise, it will wait until the Promise resolves
 * or completes to finish its logging. The actual object returned by the tracked function will
 * always be returned directly to the caller.
 *
 * @param msgs - message(s) to output after the execution "completes"
 * @param fn - function to execute
 * @param source - class, function or string to label the source of the message
 */
export function withInfo<T>(msgs: Some<unknown>, fn: () => T, source?: any): T {
    return loggedDo(msgs, fn, source, 'info');
}

/**
 * Time and log execution of a function to `console.debug()`.
 * @see withInfo
 */
export function withDebug<T>(msgs: Some<unknown>, fn: () => T, source?: any): T {
    return loggedDo(msgs, fn, source, 'debug');
}

/**
 * Write to `console.log()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logInfo(msgs: Some<unknown>, source?: any) {
    return loggedDo(msgs, null, source, 'info');
}

/**
 * Write to `console.debug()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logDebug(msgs: Some<unknown>, source?: any) {
    return loggedDo(msgs, null, source, 'debug');
}

/**
 * Write to `console.error()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logError(msgs: Some<unknown>, source?: any) {
    return loggedDo(msgs, null, source, 'error');
}

/**
 * Write to `console.warn()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logWarn(msgs: Some<unknown>, source?: any) {
    return loggedDo(msgs, null, source, 'warn');
}

//----------------------------------
// Implementation
//----------------------------------
function loggedDo(msgs: Some<any>, fn: () => any, source: any, level: LogLevel) {
    source = parseSource(source);
    msgs = castArray(msgs);

    // Support simple message only.
    if (!fn) {
        writeLog(msgs, source, level);
        return;
    }

    // Otherwise, wrap the call to the provided fn.
    let start, ret;
    const logCompletion = () => {
            const elapsed = Date.now() - start;
            writeLog([...msgs, `${elapsed}ms`], source, level);
        },
        logException = e => {
            const elapsed = Date.now() - start;
            writeLog(
                [...msgs, `failed - ${e.message ?? e.name ?? 'Unknown error'}`, `${elapsed}ms`, e],
                source,
                level
            );
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

function writeLog(msgs: Array<any>, source, level: LogLevel) {
    if (source) msgs = [`[${source}]`, ...msgs];

    const logArgs = [];
    let strMsg;

    msgs.forEach((msg, idx) => {
        const isLast = idx === msgs.length - 1,
            next = msgs[idx + 1];

        if (!isString(msg)) {
            // Log non-strings as they are.
            logArgs.push(msg);
        } else {
            // Concat consecutive strings to a single string.
            if (strMsg) {
                strMsg += ' | ' + msg;
            } else {
                strMsg = msg;
            }

            // Flush to args if next is not a string.
            // Insert trailing | if another arg will follow - more readable that way on console.
            if (!isString(next)) {
                if (!isLast) strMsg += ' |';
                logArgs.push(strMsg);
                strMsg = null;
            }
        }
    });

    switch (level) {
        case 'error':
            console.error(...logArgs);
            break;
        case 'warn':
            console.warn(...logArgs);
            break;
        case 'debug':
            console.debug(...logArgs);
            break;
        default:
            console.log(...logArgs);
    }
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
