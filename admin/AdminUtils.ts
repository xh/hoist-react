/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PlainObject, XH} from '@xh/hoist/core';
import {DAYS, LocalDate} from '@xh/hoist/utils/datetime';
import {cloneDeep, forOwn, isArray, isNumber, isPlainObject} from 'lodash';
import {fmtDateTimeSec, fmtJson} from '@xh/hoist/format';

/**
 * Generate a standardized filename for an Admin module grid export, without datestamp.
 */
export function exportFilename(moduleName: string): string {
    return `${XH.appCode}-${moduleName}`;
}

/**
 * Generate a standardized filename for an Admin module grid export, with current datestamp.
 * Returned as a closure to ensure current date is evaluated at export time.
 */
export function exportFilenameWithDate(moduleName: string): () => string {
    return () => `${XH.appCode}-${moduleName}-${LocalDate.today()}`;
}

export function fmtJsonWithFriendlyTimestamps(obj: PlainObject): string {
    obj = cloneDeep(obj);
    processWithFriendlyTimestamps(obj);
    return fmtJson(JSON.stringify(obj));
}

/**
 * Deep modify an object to replace properties that look like recent timestamps to formatted
 * strings.
 */
export function processWithFriendlyTimestamps(stats: PlainObject) {
    forOwn(stats, (v, k) => {
        if (
            (k.endsWith('Time') ||
                k.endsWith('Date') ||
                k.endsWith('Timestamp') ||
                k == 'timestamp') &&
            isNumber(v) &&
            v > Date.now() - 365 * DAYS
        ) {
            stats[k] = v ? fmtDateTimeSec(v, {fmt: 'MMM DD HH:mm:ss.SSS'}) : null;
        }
        if (isPlainObject(v) || isArray(v)) {
            processWithFriendlyTimestamps(v);
        }
    });
}
