/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {compactDateRenderer, dateRenderer, dateTimeRenderer, timeRenderer} from '@xh/hoist/format';
import {ExportFormat} from './ExportFormat';

const defaults = {align: 'right'};

export const date = {
    ...defaults,
    renderer: dateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 120
};

export const time = {
    ...defaults,
    renderer: timeRenderer(),
    width: 90
};

export const dateTime = {
    ...defaults,
    align: 'left',
    renderer: dateTimeRenderer(),
    exportFormat: ExportFormat.DATETIME_FMT,
    width: 180
};

export const compactDate = {
    ...defaults,
    renderer: compactDateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 100
};

export const localDate = {
    ...date,
    exportValue: (v) => v ? v.date : null
};

// Deprecated aliases with `Col` suffix
export const dateCol = date;
export const timeCol = time;
export const dateTimeCol = dateTime;
export const compactDateCol = compactDate;
export const localDateCol = localDate;