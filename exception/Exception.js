/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
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
     * @param {(Object)} cfg
     * @param {string} [cfg.name] - Title of the error.  Will be shown above 'message'.
     * @param {string} [cfg.message] - Short description of the error.
     */
    static create(cfg) {
        return this.createInternal({
            name: 'Exception',
            message: 'An unknown error occurred'
        }, cfg);
    }

    /**
     * @param {Object} requestOptions - original options the app passed to FetchService.fetch
     * @param {Response} response - resolved value from native fetch
     * @returns {Error}
     */
    static requestError(requestOptions, response) {
        const httpStatus = response.status,
            defaults = {
                name: 'HTTP Error ' + (httpStatus || ''),
                message: response.statusText,
                httpStatus,
                serverDetails: response.responseText,
                requestOptions
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
     * @param {Object} requestOptions - original options the app passed to FetchService.fetch
     * @param {Error} e - Error object created by native fetch
     * @returns {Error}
     */
    static serverUnavailable(requestOptions, e) {
        const match = requestOptions.url.match(/^[a-z]+:\/\/[^/]+/i),
            origin = match ? match[0] : window.location.origin,
            message = `Unable to contact the server at ${origin}`;

        return this.createInternal({
            name: 'Server Unavailable',
            message,
            httpStatus: 0,  // native fetch doesn't put status on its Error
            originalMessage: e.message,
            requestOptions
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
