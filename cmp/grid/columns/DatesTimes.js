/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {compactDateRenderer, dateRenderer, dateTimeRenderer, timeRenderer} from '@xh/hoist/format';
import {ExportFormat} from './ExportFormat';

const defaults = {align: 'right'};

export const dateCol = {
    ...defaults,
    renderer: dateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 120
};

export const timeCol = {
    ...defaults,
    renderer: timeRenderer(),
    width: 90
};

export const dateTimeCol = {
    ...defaults,
    align: 'left',
    renderer: dateTimeRenderer(),
    exportFormat: ExportFormat.DATETIME_FMT,
    width: 160
};

export const compactDateCol = {
    ...defaults,
    renderer: compactDateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 100
};

export const localDateCol = {
    ...dateCol,
    exportValue: (v) => v ? v.date : null
};
