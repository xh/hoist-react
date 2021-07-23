/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {isString} from 'lodash';

/**
 * Standardized Exception/Error objects.
 *
 * The main entry point for this class is the create() method.
 * Applications can use this method to create various generic runtime exceptions.
 * @see ExceptionHandler.handleException
 */
export class Exception {

    /**
     * Create and return a Javascript Error object.
     * @see {XH.exception} - an alias for this factory off of `XH`.
     * @param {(Object|string)} cfg - additional properties to add to the returned Error.
     *      If a string, will become the 'message' value.
     * @returns {Error}
     */
    static create(cfg) {
        return this.createInternal({
            name: 'Exception',
            message: 'An unknown error occurred'
        }, cfg);
    }

    /**
     * Create an Error for when an operation (e.g. a Promise) times out.
     * @param {number} interval - time elapsed (in ms) before this timeout was thrown.
     * @param {...*} [rest] - additional properties to add to the returned Error.
     * @returns {Error}
     */
    static timeout({interval, ...rest}) {
        return this.createInternal({
            name: 'Timeout Exception',
            message: `Operation timed out after ${interval}ms`,
            isTimeout: true,
            stack: null,
            interval,
            ...rest
        });
    }

    /**
     * Create an Error to throw when a fetch call returns a !ok response.
     * @param {Object} fetchOptions - original options provided to `FetchService.fetch()`.
     * @param {Response} response - return value of native fetch, with the addition of an optional
     *      `responseText` property containing the already-awaited output of `response.text()`. If
     *      `responseText` is determined to be a JSON object containing a `name` property, it will
     *      be treated as a serialized exception and used to construct the returned Error.
     * @returns {Error}
     */
    static fetchError(fetchOptions, response) {
        const httpStatus = response.status,
            defaults = {
                name: 'HTTP Error ' + (httpStatus || ''),
                message: response.statusText,
                httpStatus,
                serverDetails: response.responseText,
                fetchOptions
            };

        if (httpStatus === 401) {
            return this.createInternal(defaults, {
                name: 'Unauthorized',
                message: 'Your session may have timed out and you may need to log in again.'
            });
        }

        // Try to "smart" decode as server provided JSON Exception (with a name)
        try {
            const cType = response.headers.get('Content-Type');
            if (cType && cType.includes('application/json')) {
                const serverDetails = JSON.parse(response.responseText);
                if (serverDetails?.name) {
                    return this.createInternal(defaults, {
                        name: serverDetails.name,
                        message: serverDetails.message,
                        isRoutine: serverDetails.isRoutine ?? false,
                        serverDetails
                    });
                }
            }
        } catch (ignored) {}

        // Fall back to raw defaults
        return this.createInternal(defaults, {});
    }

    /**
     * Create an Error to throw when a fetch call is aborted.
     * @param {Object} fetchOptions - original options the app passed to FetchService.fetch
     * @param {Response} response - resolved value from native fetch
     * @returns {Error}
     */
    static fetchAborted(fetchOptions, response) {
        return this.createInternal({
            name: 'Fetch Aborted',
            message: `Fetch request aborted, url: "${fetchOptions.url}"`,
            isRoutine: true,
            isFetchAborted: true,
            fetchOptions,
            stack: null // Skip for fetch -- server-sourced exceptions do not include
        });
    }

    /**
     * Create an Error to throw when a fetch call times out.
     * @param {Object} fetchOptions - original options the app passed to FetchService.fetch
     * @param {Error} e - exception thrown by timeout of underlying Promise.
     * @param {string} [message] - optional custom message
     * @returns {Error}
     */
    static fetchTimeout(fetchOptions, e, message) {
        const {interval} = e;
        return this.createInternal({
            name: 'Fetch Timeout',
            isTimeout: true,
            isFetchTimeout: true,
            message: message ?? `Timed out loading '${fetchOptions.url}' - no response after ${interval}ms.`,
            fetchOptions,
            interval,
            stack: null
        });
    }

    /**
     * Create an Error for when the server called by fetch does not respond
     * @param {Object} fetchOptions - original options the app passed to FetchService.fetch
     * @param {Error} e - Error object created by native fetch
     * @returns {Error}
     */
    static serverUnavailable(fetchOptions, e) {
        const protocolPattern = /^[a-z]+:\/\//i,
            originPattern = /^[a-z]+:\/\/[^/]+/i,
            match = fetchOptions.url.match(originPattern),
            origin = match ? match[0] :
                protocolPattern.test(XH.baseUrl) ? XH.baseUrl :
                    window.location.origin,
            message = `Unable to contact the server at ${origin}`;

        return this.createInternal({
            name: 'Server Unavailable',
            message,
            httpStatus: 0,  // native fetch doesn't put status on its Error
            originalMessage: e.message,
            fetchOptions,
            stack: null
        });
    }

    //-----------------------
    // Implementation
    //-----------------------
    static createInternal(defaults, override) {
        if (isString(override)) {
            override = {message: override};
        }
        return Object.assign(new Error(), defaults, override);
    }
}
