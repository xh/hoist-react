/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {Some} from '@xh/hoist/core';
import {castArray, isString, last} from 'lodash';

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
function loggedDo(messages: Some<unknown>, fn: () => any, source: any, level: LogLevel) {
    let src = parseSource(source);
    let msgs = castArray(messages);

    // Support simple message only.
    if (!fn) {
        writeLog(msgs, src, level);
        return;
    }

    // Otherwise, wrap the call to the provided fn.
    let start, ret;
    const logCompletion = () => {
            const elapsed = Date.now() - start;
            writeLog([...msgs, `${elapsed}ms`], src, level);
        },
        logException = e => {
            const elapsed = Date.now() - start;
            writeLog(
                [...msgs, `failed - ${e.message ?? e.name ?? 'Unknown error'}`, `${elapsed}ms`, e],
                src,
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

function parseSource(source: any): string {
    if (isString(source)) return source;
    if (source?.displayName) return source.displayName;
    if (source?.constructor) return source.constructor.name;
    return '';
}

function writeLog(msgs: unknown[], src: string, level: LogLevel) {
    if (src) msgs = [`[${src}]`, ...msgs];

    const logArgs = [];
    msgs.forEach(curr => {
        const prev = last(logArgs),
            prevIsString = isString(prev),
            currIsString = isString(curr);

        if (prevIsString && currIsString) {
            // Concatenate adjacent strings
            logArgs[logArgs.length - 1] = prev + ' | ' + curr;
        } else {
            // ...and insert delimiter after string and before object
            if (prevIsString && !currIsString) logArgs.push(' |');
            logArgs.push(curr);
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
        case 'info':
            console.log(...logArgs);
            break;
    }
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
