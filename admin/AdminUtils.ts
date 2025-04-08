/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {DAYS, LocalDate} from '@xh/hoist/utils/datetime';
import {isNumber} from 'lodash';
import {fmtDateTimeSec} from '@xh/hoist/format';

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

/**
 * Replacer for JSON.stringify to replace timestamp properties with formatted strings.
 */
export function timestampReplacer(k: string, v: any) {
    if (
        (k.endsWith('Time') || k.endsWith('Date') || k.endsWith('Timestamp') || k == 'timestamp') &&
        isNumber(v) &&
        v > Date.now() - 25 * 365 * DAYS // heuristic to avoid catching smaller ms ranges
    ) {
        return fmtDateTimeSec(v, {fmt: 'MMM DD HH:mm:ss.SSS'});
    }

    return v;
}
