/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import type {HoistException, TimeoutException, TimeoutExceptionConfig} from './Types';

import {isPlainObject} from 'lodash';

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

    /** Create an Error for when an operation (e.g. a Promise) times out. */
    static timeout(config: TimeoutExceptionConfig): TimeoutException {
        const {interval, ...rest} = config,
            // Display timeout in seconds if an even multiple (or very close to it).
            displayInterval =
                interval % 1000 < 5 && interval > 2000
                    ? `${Math.round(interval / 1000)}secs`
                    : `${interval}ms`;

        return this.createInternal({
            name: 'Timeout Exception',
            // Note FetchService.managedFetchAsync appends to this message - review if changing.
            message: `Timed out after ${displayInterval}`,
            isTimeout: true,
            stack: null,
            interval,
            ...rest
        }) as TimeoutException;
    }

    private static createInternal(attributes: PlainObject, baseError?: Error) {
        const {message, ...rest} = attributes;
        const ret = Object.assign(
            baseError ?? new Error(message),
            {
                isRoutine: false,
                isHoistException: true
            },
            rest
        ) as HoistException;

        // statuses of 0, 4XX, 5XX are server errors, so stack irrelevant and potentially misleading
        if (ret.stack == null || /^[045]/.test(ret.httpStatus)) delete ret.stack;

        return ret;
    }
}

export function isHoistException(src: unknown): src is HoistException {
    return src?.['isHoistException'];
}
