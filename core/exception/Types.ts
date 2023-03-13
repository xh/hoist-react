import {PlainObject} from '@xh/hoist/core';
import {FetchOptions} from '@xh/hoist/svc';

export interface HoistException extends Error {
    isHoistException: true;
    isRoutine: boolean;
    [x: string]: any;
}

export interface TimeoutException extends HoistException {
    isTimeout: true;
    interval: number;
}

export interface FetchException extends HoistException {
    httpStatus: number;
    serverDetails: string | PlainObject;
    fetchOptions: FetchOptions;
}
