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

    static create(cfg) {
        return this.createInternal({
            name: 'Exception',
            message: 'An unknown error occurred'
        }, cfg);
    }

    static requestCancelled(requestOptions, reason) {
        return this.createInternal({
            name: 'Request Cancelled',
            message: reason,
            requestOptions
        });
    }

    static requestTimeout(requestOptions) {
        return this.createInternal({
            name: 'Request Timeout',
            message: 'The request to the server timed out',
            requestOptions
        });
    }

    static requestError(url, requestOptions, response) {
        const httpStatus = response.status,
            defaults = {
                name: 'HTTP Error ' + (httpStatus || ''),
                message: response.statusText,
                httpStatus: httpStatus,
                url,
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

    static serverUnavailable(url, requestOptions, e) {
        const match = url.match(/^[a-z]+:\/\/[^/]+/i),
            origin = match ? match[0] : window.location.origin,
            message = `Unable to contact the server at ${origin}`;

        return this.createInternal({
            name: 'Server Unavailable',
            message,
            originalMessage: e.message,
            url,
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
        const ret = Object.assign(new Error(), defaults, override),
            status = ret.httpStatus;

        if (!status || /^[45]\d\d$/.test(status)) delete ret.stack;

        return ret;
    }
}
