/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';
import {XH} from '@xh/hoist/core';

/**
 * Standardized Exception/Error objects.
 *
 * The main entry point for this class is the create() method.
 * Applications can use this method to create various generic runtime exceptions.
 * @see ExceptionHandler.handleException
 */
export class Exception {

    /**
     * Create and get back a Javascript Error object
     * @param {(Object|string)} cfg - Properties to add to the Error object.
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
     * Create an Error for when fetch calls go bad...
     * @param {Object} fetchOptions - original options the app passed to FetchService.fetch
     * @param {Response} response - resolved value from native fetch
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
                if (serverDetails && serverDetails.name) {
                    return this.createInternal(defaults, {
                        name: serverDetails.name,
                        message: serverDetails.message,
                        serverDetails
                    });
                }
            }
        } catch (ignored) {}

        // Fall back to raw defaults
        return this.createInternal(defaults, {});
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
            fetchOptions
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
