/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

/** Returns the name of the file to be exported from a grid/panel with the app code prepended */
export function exportFilename(moduleName: string): string {
    return `${XH.appCode}-${moduleName}`;
}

/** Returns the name of the file to be exported from a grid/panel with the app code prepended
 * and the current date appended. */
export function exportFilenameWithDate(moduleName: string): () => string {
    return () => `${XH.appCode}-${moduleName}-${LocalDate.today()}`;
}
