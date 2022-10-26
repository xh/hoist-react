/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {FetchOptions} from '@xh/hoist/svc';
import {PlainObject, XH} from '../';
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
     * See {@link XH.exception} - an alias for this factory off of `XH`.
     * @param cfg - properties to add to the returned Error, or a string to use as message.
     */
    static create(cfg: PlainObject|string): Error {
        return this.createInternal({
            name: 'Exception',
            message: 'An unknown error occurred'
        }, cfg);
    }

    /**
     * Create an Error for when an operation (e.g. a Promise) times out.
     * @param interval - time elapsed (in ms) before this timeout was thrown.
     * @param rest - additional properties to add to the returned Error.
     */
    static timeout({interval, ...rest}) {
        const displayInterval = (interval % 1000) ? `${interval}ms` : `${interval/1000}s`;
        return this.createInternal({
            name: 'Timeout Exception',
            message: `Operation timed out after ${displayInterval}`,
            isTimeout: true,
            stack: null,
            interval,
            ...rest
        });
    }

    /**
     * Create an Error to throw when a fetch call returns a !ok response.
     * @param fetchOptions - original options provided to `FetchService.fetch()`.
     * @param response - return value of native fetch, with the addition of an optional
     *      `responseText` property containing the already-awaited output of `response.text()`. If
     *      `responseText` is determined to be a JSON object containing a `name` property, it will
     *      be treated as a serialized exception and used to construct the returned Error.
     */
    static fetchError(fetchOptions: FetchOptions, response) {
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
     * @param fetchOptions - original options the app passed to FetchService.
     * @param e - Error thrown by native fetch
     */
    static fetchAborted(fetchOptions: FetchOptions, e) {
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
     * @param fetchOptions - original options the app passed when calling FetchService.
     * @param e - exception thrown by timeout of underlying Promise.
     * @param message - optional custom message
     */
    static fetchTimeout(fetchOptions: FetchOptions, e, message: string): Error {
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
     * @param fetchOptions - original options the app passed to FetchService.fetch
     * @param e - Error thrown by native fetch
     */
    static serverUnavailable(fetchOptions: FetchOptions, e) {
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
    private static createInternal(defaults, override={}) {
        if (isString(override)) {
            override = {message: override};
        }
        return Object.assign(new Error(), defaults, override, {isHoistException: true});
    }
}
