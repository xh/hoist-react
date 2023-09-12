/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, dateTimeSec} from '@xh/hoist/cmp/grid';
import {XH} from '@xh/hoist/core';
import {dateTimeRenderer} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';

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
 * A precise datetime column without the year.
 * Useful for managing/monitoring processes without a lot of long-term history
 */
export const adminDateTimeSec: ColumnSpec = {
    ...dateTimeSec,
    renderer: dateTimeRenderer({fmt: 'MM-DD h:mm:ssa'})
};