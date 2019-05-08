/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {castArray} from 'lodash';

/**
 * Provide basic support for console logging when actions occur, and how long they took.
 *
 * The methods provided are designed to allow logging the behavior and peformance
 * of code sections with minimal disruption to the flow of the code being logged.
 *
 * If the tracked function passed to this classes methods returns a Promise, the methods will
 * appropriately wait until the Promise resolves or completes to finish its logging. In
 * any case, the actual object returned by the tracked function will be returned directly to
 * the caller.
 */
export class ExecutionLogger {

    /**
     * Create an instance of this object.
     *
     * @param {Object} [c] - config object.
     * @param {Object} [c.source] - class or function owning this logger.
     * @param {String} [c.label] - label to be used for this logger.  Will be defaulted from source, if provided.
     */
    static create({source, label} = {}) {
        return new ExecutionLogger({source, label});
    }

    /**
     * Surround a function's execution with log messages and timing info.
     * @param {(String[]|String)} msgs
     * @param {function} fn
     */
    withLog(msgs, fn) {
        return this.loggedDo({level: 'log', short: false, msgs, fn});
    }

    /**
     * Track a function execution with log messages and timing info.
     * @param {(String[]|String)} msgs
     * @param {function} fn
     */
    withShortLog(msgs, fn) {
        return this.loggedDo({level: 'log', short: true, msgs, fn});
    }

    /**
     * Track a function execution with log messages and timing info.
     * @param {(String[]|String)} msgs
     * @param {function} fn
     */
    withDebug(msgs, fn) {
        return this.loggedDo({level: 'debug', short: false, msgs, fn});
    }

    /**
     * Track a function execution with log messages and timing info.
     * @param {(String[]|String)} msgs
     * @param {function} fn
     */
    withShortDebug(msgs, fn) {
        return this.loggedDo({level: 'debug', short: true, msgs, fn});
    }

    //----------------------------------
    // Implementation
    //----------------------------------
    constructor({source, label}) {
        this.source = source;
        if (label === undefined) {
            if (source && source.constructor) {
                label = source.constructor.name;
            } else if (source.name) {
                label = source.name;
            } else {
                label = 'ANON';
            }
        }
        if (label == null) label = '';

        this.label = label;
    }

    loggedDo({level, short, msgs, fn}) {

        msgs = castArray(msgs);
        const msg = msgs.join(' | ');
        if (!short) this.logAtLevel(level, `${msg} | started`);

        const start = Date.now();
        let ret;
        try {
            ret = fn();
        } catch (e) {
            this.logException(start, level, msg, e);
            throw e;
        }

        if (ret instanceof Promise) {
            ret.then(
                () => this.logCompletion(start, level, msg),
                (e) => this.logException(start, level, msg, e)
            );
        } else {
            this.logCompletion(start, level, msg);
        }

        return ret;
    }

    //--------------------------------------
    // Implementation
    //-------------------------------------
    logAtLevel(level, msg) {
        console[level](`[${this.label}] ${msg}`);
    }

    logCompletion(start, level, msg) {
        const elapsed = Date.now() - start;
        this.logAtLevel(level, `${msg} | completed | ${elapsed}`);
    }

    logException(start, level, msg, e)  {
        const elapsed = Date.now() - start;
        this.logAtLevel(level, `${msg} | failed - ${e.message || e.name || 'Unknown error'} | ${elapsed}`);
    }
}