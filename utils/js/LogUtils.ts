/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Some} from '@xh/hoist/core';
import {castArray, isString} from 'lodash';
import {intersperse} from './LangUtils';

export type LogSource = string | {displayName: string} | {constructor: {name: string}};

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
export function withInfo<T>(msgs: Some<unknown>, fn: () => T, source?: LogSource): T {
    return loggedDo(msgs, fn, source, 'info');
}

/**
 * Time and log execution of a function to `console.debug()`.
 * @see withInfo
 */
export function withDebug<T>(msgs: Some<unknown>, fn: () => T, source?: LogSource): T {
    return loggedDo(msgs, fn, source, 'debug');
}

/**
 * Write to `console.log()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logInfo(msgs: Some<unknown>, source?: LogSource) {
    return loggedDo(msgs, null, source, 'info');
}

/**
 * Write to `console.debug()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logDebug(msgs: Some<unknown>, source?: LogSource) {
    return loggedDo(msgs, null, source, 'debug');
}

/**
 * Write to `console.error()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logError(msgs: Some<unknown>, source?: LogSource) {
    return loggedDo(msgs, null, source, 'error');
}

/**
 * Write to `console.warn()` with standardized formatting and source info.
 * @param msgs - message(s) to output
 * @param source - class, function or string to label the source of the message
 */
export function logWarn(msgs: Some<unknown>, source?: LogSource) {
    return loggedDo(msgs, null, source, 'warn');
}

/** Parse a LogSource in to a canonical string label. */
export function parseSource(source: LogSource): string {
    if (!source) return null;
    if (isString(source)) return source;
    if (source['displayName']) return source['displayName'];
    if (source.constructor) return source.constructor.name;
    return null;
}

//----------------------------------
// Implementation
//----------------------------------
function loggedDo<T>(messages: Some<unknown>, fn: () => T, source: LogSource, level: LogLevel) {
    let src = parseSource(source);
    let msgs = castArray(messages);

    // Support simple message only.
    if (!fn) {
        writeLog(msgs, src, level);
        return;
    }

    // Otherwise, wrap the call to the provided fn.
    let start: number, ret: T;
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

function writeLog(msgs: unknown[], src: string, level: LogLevel) {
    if (src) msgs = [`[${src}]`, ...msgs];

    msgs = intersperse(msgs, '|');

    switch (level) {
        case 'error':
            console.error(...msgs);
            break;
        case 'warn':
            console.warn(...msgs);
            break;
        case 'debug':
            console.debug(...msgs);
            break;
        case 'info':
            console.log(...msgs);
            break;
    }
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
