/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import type {Some} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {castArray, isString, isUndefined} from 'lodash';
import store from 'store2';
import {intersperse} from './LangUtils';

/**
 * Utility functions providing managed, structured logging to Hoist apps.
 *
 * Essentially a wrapper around the browser console supporting logging levels, timing, and
 * miscellaneous Hoist display conventions.
 *
 * Objects extending `HoistBase` need not import these functions directly, as they are available
 * via delegates on `HoistBase`.
 *
 * Hoist sets its minimum severity level to 'info' by default.  This prevents performance or
 * memory impacts that might result from verbose debug logging.  This can be adjusted by calling
 * XH.logLevel from the console.
 */

/** Severity Level for log statement */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Object identifying the source of log statement.  Typically, a javascript class */
export type LogSource = string | {displayName: string} | {constructor: {name: string}};

export interface APIWarnOptions {
    /**
     * If provided and undefined, this method will be a no-op.
     * Useful for testing if a parameter has been provided in caller.
     */
    test?: any;

    /** Version when this API will no longer be supported or this warning should be removed. */
    v?: string;

    /** An additional message. Can contain suggestions for alternatives. */
    msg?: string;

    /** Source of message for labelling log message.  */
    source?: LogSource;
}

/**
 * Current minimum severity for Hoist log utils (default 'info').
 * Messages logged via managed Hoist log utils with lower severity will be ignored.
 *
 * @internal - use public `XH.logLevel`.
 */
export function getLogLevel() {
    return _logLevel;
}

/**
 * Set the minimum severity for Hoist log utils until the page is refreshed. Optionally persist
 * this adjustment to sessionStorage to maintain for the lifetime of the browser tab.
 *
 * @internal - use public `XH.setLogLevel()`.
 */
export function setLogLevel(level: LogLevel, persistInSessionStorage: boolean = false) {
    level = level.toLowerCase() as LogLevel;

    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(level)) {
        console.error(`Ignored invalid log level '${level}' - must be one of ${validLevels}`);
        return;
    }
    _logLevel = level;
    if (persistInSessionStorage) {
        store.session.set('xhLogLevel', level);
    }
    if (level != 'info') {
        console.warn(`Client logging set to level '${level}'.`);
    }
}

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

/**
 * Log a warning to the console if a condition evaluates as truthy.
 */
export function warnIf(condition: any, message: any) {
    if (condition) {
        logWarn(message);
    }
}

/**
 * Log an error to the console if a condition evaluates as truthy.
 */
export function errorIf(condition: any, message: any) {
    if (condition) {
        logError(message);
    }
}

/**
 * Document and prevent usage of a removed parameter.
 */
export function apiRemoved(name: string, opts: APIWarnOptions = {}) {
    if ('test' in opts && isUndefined(opts.test)) return;

    const src = opts.source ? `[${opts.source}] ` : '',
        msg = opts.msg ? ` ${opts.msg}.` : '';
    // low-level exception api for low-level package
    throw Exception.create(`${src}The use of '${name}' is no longer supported.${msg}`);
}

/**
 * Document and warn on usage of a deprecated API
 *
 * @param name - the name of the deprecated parameter
 */
const _seenWarnings = {};
export function apiDeprecated(name: string, opts: APIWarnOptions = {}) {
    if ('test' in opts && isUndefined(opts.test)) return;

    const v = opts.v ?? 'a future release',
        msg = opts.msg ?? '',
        warn = `The use of '${name}' has been deprecated and will be removed in ${v}. ${msg}`;
    if (!_seenWarnings[warn]) {
        logWarn(warn, opts.source);
        _seenWarnings[warn] = true;
    }
}

//----------------------------------
// Implementation
//----------------------------------
function loggedDo<T>(messages: Some<unknown>, fn: () => T, source: LogSource, level: LogLevel): T {
    if (_severity[level] < _severity[_logLevel]) {
        return fn?.();
    }

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

/** Parse a LogSource in to a canonical string label. */
function parseSource(source: LogSource): string {
    if (!source) return null;
    if (isString(source)) return source;
    if (source['displayName']) return source['displayName'];
    if (source.constructor) return source.constructor.name;
    return null;
}

//----------------------------------------------------------------
// Initialization + Level/Severity support.
// Initialize during parsing to make available immediately.
//----------------------------------------------------------------
let _logLevel: LogLevel = 'info';
const _severity: Record<LogLevel, number> = {error: 3, warn: 2, info: 1, debug: 0};

setLogLevel(store.session.get('xhLogLevel', 'info'));
