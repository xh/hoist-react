/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {fileColFactory} from './Utils.js';
import {dateRenderer, dateTimeRenderer, timeRenderer, compactDateRenderer} from '../utils/Format.js';

const colFactory = fileColFactory({
    xtype: 'datecolumn',
    align: 'right',
    xhChooserGroup: 'Dates / Times'
});

export const dateCol = colFactory({
    text: 'Date',
    valueFormatter: dateRenderer(),
    width: 120
});

export const timeCol = colFactory({
    text: 'Time',
    valueFormatter: timeRenderer(),
    width: 90
});

export const dateTimeCol = colFactory({
    text: 'Date',
    valueFormatter: dateTimeRenderer(),
    width: 160
});

export const compactDateCol = colFactory({
    text: 'Date',
    valueFormatter: compactDateRenderer(),
    width: 100
});