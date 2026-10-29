/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, ExcelFormat} from '@xh/hoist/cmp/grid';
import {
    compactDateTextRenderer,
    dateTextRenderer,
    dateTimeTextRenderer,
    dateTimeSecTextRenderer,
    timeTextRenderer
} from '@xh/hoist/format';

const defaults: ColumnSpec = {align: 'right'};

export const date: ColumnSpec = {
    ...defaults,
    textRenderer: dateTextRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 120
};

export const time: ColumnSpec = {
    ...defaults,
    textRenderer: timeTextRenderer(),
    width: 90
};

export const dateTime: ColumnSpec = {
    ...defaults,
    align: 'left',
    textRenderer: dateTimeTextRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 180
};

export const dateTimeSec: ColumnSpec = {
    ...defaults,
    align: 'left',
    textRenderer: dateTimeSecTextRenderer(),
    excelFormat: ExcelFormat.DATETIME_FMT,
    width: 190
};

export const compactDate: ColumnSpec = {
    ...defaults,
    textRenderer: compactDateTextRenderer(),
    excelFormat: ExcelFormat.DATE_FMT,
    width: 100
};

export const localDate: ColumnSpec = {
    ...date
};
