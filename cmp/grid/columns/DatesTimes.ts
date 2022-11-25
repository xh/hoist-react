/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {compactDateRenderer, dateRenderer, dateTimeRenderer, dateTimeSecRenderer, timeRenderer} from '@xh/hoist/format';
import {ExcelFormat} from '../enums/ExcelFormat';

const defaults = {align: 'right'} as ColumnSpec;

export const date = {
    ...defaults,
    renderer: dateRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 120
} as ColumnSpec;

export const time = {
    ...defaults,
    renderer: timeRenderer(),
    width: 90
} as ColumnSpec;

export const dateTime = {
    ...defaults,
    align: 'left',
    renderer: dateTimeRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 180
} as ColumnSpec;

export const dateTimeSec = {
    ...defaults,
    align: 'left',
    renderer: dateTimeSecRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 190
} as ColumnSpec;

export const compactDate = {
    ...defaults,
    renderer: compactDateRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 100
} as ColumnSpec;

export const localDate = {
    ...date
} as ColumnSpec;

// Deprecated aliases with `Col` suffix
export const dateCol = date;
export const timeCol = time;
export const dateTimeCol = dateTime;
export const compactDateCol = compactDate;
export const localDateCol = localDate;
