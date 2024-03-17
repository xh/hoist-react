/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {
    compactDateRenderer,
    dateRenderer,
    dateTimeRenderer,
    dateTimeSecRenderer,
    timeRenderer
} from '@xh/hoist/format';
import {ExcelFormat} from '../enums/ExcelFormat';

const defaults: ColumnSpec = {align: 'right'};

export const date: ColumnSpec = {
    ...defaults,
    renderer: dateRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 120
};

export const time: ColumnSpec = {
    ...defaults,
    renderer: timeRenderer(),
    width: 90
};

export const dateTime: ColumnSpec = {
    ...defaults,
    align: 'left',
    renderer: dateTimeRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 180
};

export const dateTimeSec: ColumnSpec = {
    ...defaults,
    align: 'left',
    renderer: dateTimeSecRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 190
};

export const compactDate: ColumnSpec = {
    ...defaults,
    renderer: compactDateRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 100
};

export const localDate: ColumnSpec = {
    ...date
};

// Deprecated aliases with `Col` suffix
export const dateCol = date;
export const timeCol = time;
export const dateTimeCol = dateTime;
export const compactDateCol = compactDate;
export const localDateCol = localDate;
