/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {colFactory} from './Column.js';
import {ExportFormat} from './ExportFormat';
import {dateRenderer, dateTimeRenderer, timeRenderer, compactDateRenderer} from '../format';

const defaults = {align: 'right'};

export const dateCol = colFactory({
    ...defaults,
    headerName: 'Date',
    renderer: dateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 120
});

export const timeCol = colFactory({
    ...defaults,
    headerName: 'Time',
    renderer: timeRenderer(),
    width: 90
});

export const dateTimeCol = colFactory({
    ...defaults,
    headerName: 'Date',
    renderer: dateTimeRenderer(),
    exportFormat: ExportFormat.DATETIME_FMT,
    width: 160
});

export const compactDateCol = colFactory({
    ...defaults,
    headerName: 'Date',
    renderer: compactDateRenderer(),
    exportFormat: ExportFormat.DATE_FMT,
    width: 100
});