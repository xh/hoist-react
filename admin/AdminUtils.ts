/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

export function getExportFilename(moduleName: string, localDate = true): string | (() => string) {
    let filename = `${XH.appCode}-${moduleName}`;
    return localDate ? () => filename + '-' + LocalDate.today() : filename;
}
