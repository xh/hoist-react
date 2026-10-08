/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, ExcelFormat} from '@xh/hoist/cmp/grid';
import {
    compactDateFormatter,
    dateFormatter,
    dateTimeFormatter,
    dateTimeSecFormatter,
    timeFormatter
} from '@xh/hoist/format';

const defaults: ColumnSpec = {align: 'right'};

export const date: ColumnSpec = {
    ...defaults,
    formatter: dateFormatter(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 120
};

export const time: ColumnSpec = {
    ...defaults,
    formatter: timeFormatter(),
    width: 90
};

export const dateTime: ColumnSpec = {
    ...defaults,
    align: 'left',
    formatter: dateTimeFormatter(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 180
};

export const dateTimeSec: ColumnSpec = {
    ...defaults,
    align: 'left',
    formatter: dateTimeSecFormatter(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 190
};

export const compactDate: ColumnSpec = {
    ...defaults,
    formatter: compactDateFormatter(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 100
};

export const localDate: ColumnSpec = {
    ...date
};
