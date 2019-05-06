/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {applyMixin} from '@xh/hoist/utils/js';
import {castArray} from 'lodash';

/**
 * Mixin to provide basic support for console logging when actions occur, and how long they took.
 *
 * The methods provided by this mixin are designed to allow logging the behavior and peformance
 * of code sections with minimal disruption to the flow of the code being logged.
 */
export function LogSupport(C) {
    return applyMixin(C, {
        name: 'LogSupport',

        provides: {

            /**
             * Surround a function's execution with log messages, and timing info.
             *
             * @param {(String[]|String)} msgs -- One or more strings to form a compound log message.
             * @param {function} fn - function to be tracked by this log message.
             * @returns {*} - value returned by fn
             */
            withLog(msgs, fn) {
                return this.xhLoggedDo({level: 'log', full: true, msgs, fn});
            },

            /**
             * Track a function's execution with a single log message, and timing info.
             *
             * @param {(String[]|String)} msgs -- One or more strings to form a compound log message.
             * @param {function} fn - function to be tracked by this log message.
             * @returns {*} - value returned by fn
             */
            withShortLog(msgs, fn) {
                return this.xhLoggedDo({level: 'log', full: false, msgs, fn});
            },

            /**
             * Surround a function's execution with debug messages, and timing info.
             *
             * @param {(String[]|String)} msgs -- One or more strings to form a compound log message.
             * @param {function} fn - function to be tracked by this log message.
             * @returns {*} - value returned by fn
             */
            withDebug(msgs, fn) {
                return this.xhLoggedDo({level: 'debug', full: true, msgs, fn});
            },

            /**
             * Track a function's execution with a single debug message, and timing info.
             *
             * @param {(String[]|String)} msgs -- One or more strings to form a compound log message.
             * @param {function} fn - function to be tracked by this log message.
             * @returns {*} - value returned by fn
             */
            withShortDebug(msgs, fn) {
                return this.xhLoggedDo({level: 'debug', full: false, msgs, fn});
            },
            
            //----------------------------------
            // Implementation
            //----------------------------------
            xhLoggedDo({level, full, msgs, fn}) {

                msgs = castArray(msgs);

                const start = Date.now(),
                    msg = msgs.join(' | ');

                if (full) this.xhLogAtLevel(level, `${msg} | started`);

                let ret, elapsed;
                try {
                    ret = fn();
                } catch (e) {
                    elapsed = Date.now() - start;
                    this.xhLogAtLevel(level, `${msg} | failed - ${e.message || e.name || 'Unknown error'} | ${elapsed}`);
                    throw e;
                }

                elapsed = Date.now() - start;
                this.xhLogAtLevel(level, `${msg} | completed | ${elapsed}`);

                return ret;
            },

            xhLogAtLevel(level, msg) {
                console[level](`[${this.constructor.name}] ${msg}`);
            }
        }
    });
}