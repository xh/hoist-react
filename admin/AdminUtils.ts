/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
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
