/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {FetchOptions} from '@xh/hoist/svc';
import {FetchResponse, PlainObject, XH} from '../';
import {isPlainObject} from 'lodash';

import {FetchException, HoistException, TimeoutException, TimeoutExceptionConfig} from './Types';

/**
 * Standardized Exception/Error objects.
 *
 * The main entry point for this class is the create() method.
 * Applications can use this method to create various generic runtime exceptions.
 * @see ExceptionHandler.handleException
 */
export class Exception {
    /**
     * Create and return a HoistException
     *
     * See {@link XH.exception} - an alias for this factory off of `XH`.
     *
     * @param src - If a native JS Error, it will be enhanced into a HoistException and returned.
     *      If a plain object, all properties will be set on a new HoistException.
     *      Other inputs will be treated as the `message` of a new HoistException.
     */
    static create(src: unknown): HoistException {
        if (isHoistException(src)) return src;
        if (src instanceof Error) return this.createInternal({}, src);

        const attributes: PlainObject = isPlainObject(src) ? src : {message: src?.toString()};
        return this.createInternal({
            name: 'Exception',
            message: 'An unknown error occurred',
            ...attributes
        });
    }

    /**
     * Create an Error for when an operation (e.g. a Promise) times out.
     */
    static timeout(config: TimeoutExceptionConfig): TimeoutException {
        const {interval, ...rest} = config,
            displayInterval = interval % 1000 ? `${interval}ms` : `${interval / 1000}s`;
        return this.createInternal({
            name: 'Timeout Exception',
            message: `Operation timed out after ${displayInterval}`,
            isTimeout: true,
            stack: null,
            interval,
            ...rest
        }) as TimeoutException;
    }

    /**
     * Create an Error to throw when a fetch call returns a !ok response.
     * @param fetchOptions - original options passed to FetchService.
     * @param fetchResponse - return value of native fetch, as enhanced by FetchService.
     */
    static fetchError(fetchOptions: FetchOptions, fetchResponse: FetchResponse): FetchException {
        const {headers, status, statusText, responseText} = fetchResponse,
            defaults = {
                name: 'HTTP Error ' + (status || ''),
                message: statusText,
                httpStatus: status,
                serverDetails: responseText,
                fetchOptions
            };

        if (status === 401) {
            return this.createFetchException({
                ...defaults,
                name: 'Unauthorized',
                message: 'Your session may have timed out and you may need to log in again.'
            });
        }

        // Try to "smart" decode as server provided JSON Exception (with a name)
        try {
            const cType = headers.get('Content-Type');
            if (cType && cType.includes('application/json')) {
                const serverDetails = JSON.parse(responseText);
                if (serverDetails?.name) {
                    return this.createFetchException({
                        ...defaults,
                        name: serverDetails.name,
                        message: serverDetails.message,
                        isRoutine: serverDetails.isRoutine ?? false,
                        serverDetails
                    });
                }
            }
        } catch (ignored) {}

        // Fall back to raw defaults
        return this.createFetchException(defaults);
    }

    /**
     * Create an Error to throw when a fetchJson call encounters a SyntaxError.
     * @param fetchOptions - original options passed to FetchService.
     * @param cause - object thrown by native {@link response.json}.
     */
    static fetchJsonParseError(fetchOptions: FetchOptions, cause: any): FetchException {
        return this.createFetchException({
            name: 'JSON Parsing Error',
            message:
                'Error parsing the response body as JSON. The server may have returned an invalid ' +
                'or empty response. Use "XH.fetch()" to process the response manually.',
            fetchOptions,
            cause
        });
    }

    /**
     * Create an Error to throw when a fetch call is aborted.
     * @param fetchOptions - original options passed to FetchService.
     * @param cause - object thrown by native fetch
     */
    static fetchAborted(fetchOptions: FetchOptions, cause: any): FetchException {
        return this.createFetchException({
            name: 'Fetch Aborted',
            message: `Fetch request aborted, url: "${fetchOptions.url}"`,
            isRoutine: true,
            isFetchAborted: true,
            fetchOptions,
            cause
        });
    }

    /**
     * Create an Error to throw when a fetch call times out.
     * @param fetchOptions - original options the app passed when calling FetchService.
     * @param cause - underlying timeout exception
     * @param message - optional custom message
     *
     * @returns an exception that is both a TimeoutException, and a FetchException, with the
     *      underlying TimeoutException as its cause.
     */
    static fetchTimeout(
        fetchOptions: FetchOptions,
        cause: TimeoutException,
        message: string
    ): FetchException & TimeoutException {
        return this.createFetchException({
            name: 'Fetch Timeout',
            message,
            isFetchTimeout: true,
            isTimeout: true,
            interval: cause.interval,
            fetchOptions,
            cause
        }) as FetchException & TimeoutException;
    }

    /**
     * Create an Error for when the server called by fetch does not respond
     * @param fetchOptions - original options the app passed to FetchService.fetch
     * @param cause - object thrown by native fetch
     */
    static serverUnavailable(fetchOptions: FetchOptions, cause: any): FetchException {
        const protocolPattern = /^[a-z]+:\/\//i,
            originPattern = /^[a-z]+:\/\/[^/]+/i,
            match = fetchOptions.url.match(originPattern),
            origin = match
                ? match[0]
                : protocolPattern.test(XH.baseUrl)
                  ? XH.baseUrl
                  : window.location.origin;

        return this.createFetchException({
            name: 'Server Unavailable',
            message: `Unable to contact the server at ${origin}`,
            isServerUnavailable: true,
            fetchOptions,
            cause
        });
    }

    //-----------------------
    // Implementation
    //-----------------------
    private static createFetchException(attributes: PlainObject) {
        return this.createInternal({
            isFetchAborted: false,
            httpStatus: 0, // native fetch doesn't put status on its Error
            serverDetails: null,
            stack: null, // server-sourced exceptions do not include, neither should client, not relevant
            ...attributes
        }) as FetchException;
    }

    private static createInternal(attributes: PlainObject, baseError: Error = new Error()) {
        let correlationId: string;
        const correlationIdToken = XH?.fetchService?.correlationIdHeaderKey;
        if (correlationIdToken) {
            correlationId = attributes.fetchOptions?.headers?.[correlationIdToken];
        }
        return Object.assign(
            baseError,
            {
                correlationId,
                isRoutine: false,
                isHoistException: true
            },
            attributes
        ) as HoistException;
    }
}

export function isHoistException(src: unknown): src is HoistException {
    return src?.['isHoistException'];
}
