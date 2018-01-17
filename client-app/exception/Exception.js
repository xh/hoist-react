/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';

/**
 * Default Exception (Error) creation for Hoist Apps.
 *
 * The main application entry point for this class is the create() method.
 * Applications can use this method to create various generic runtime exceptions.
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
            requestOptions: requestOptions
        });
    }

    static requestTimeout(requestOptions) {
        return this.createInternal({
            name: 'Request Timeout',
            message: 'The request to the server timed out',
            requestOptions: requestOptions
        });
    }

    static requestError(requestOptions, response) {
        const httpStatus = response.status,
            defaults = {
                name: 'HTTP Error ' + (httpStatus || ''),
                message: response.statusText,
                httpStatus: httpStatus,
                serverDetails: response.responseText,
                requestOptions: requestOptions
            };

        if (httpStatus === 401) {
            return this.createInternal(defaults, {
                name: 'Unauthorized',
                message: 'Your session may have timed out and you may need to log in again.'
            });
        }

        if (httpStatus === 0) {
            return this.createInternal(defaults, {
                name: 'Connection Failure',
                message: 'Unable to connect to server. The server or the network may be unavailable, or the request may have been cancelled.'
                // For a cancel coming from Hoist, a RequestCancelled (above) should be generated but other places
                // in the stack may yield cancellations that are indistinguishable from connect failures
            });
        }

        // Try to "smart" decode as server provided JSON Exception (with a name)
        try {
            const cType = response.getResponseHeader('Content-Type');
            if (cType && cType.includes('application/json')) {
                const serverDetails = JSON.parse(response.responseText);
                if (serverDetails && serverDetails.name) {
                    return this.createInternal(defaults, {
                        name: serverDetails.name,
                        message: serverDetails.message,
                        serverDetails: serverDetails
                    });
                }
            }
        } catch (ignored) {}

        // Fall back to raw defaults
        return this.createInternal(defaults, {});
    }

    //-----------------------
    // Implementation
    //------------------------
    static createInternal(defaults, override) {
        if (isString(override)) {
            override = {message: override};
        }
        return Object.assign(new Error(), defaults, override);
    }
}
