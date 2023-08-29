/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

/** Returns the name of the file to be exported from a grid/panel with the app code prepended and
 * the current date potentially appended. */
export function getExportFilename(moduleName: string, localDate = true): string | (() => string) {
    let filename = `${XH.appCode}-${moduleName}`;
    return localDate ? () => filename + '-' + LocalDate.today() : filename;
}
