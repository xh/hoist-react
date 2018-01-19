/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {fileColFactory} from './Utils.js';

const colFactory = fileColFactory({
    xtype: 'datecolumn',
    align: 'right',
    xhChooserGroup: 'Dates / Times'
});

export const dateCol = colFactory({
    text: 'Date',
    // renderer: dateRenderer(),
    width: 120
});

export const timeCol = colFactory({
    text: 'Time',
    // renderer: timeRenderer(),
    width: 90
});

export const dateTimeCol = colFactory({
    text: 'Date',
    // renderer: dateTimeRenderer(),
    width: 140
});

export const compactDateCol = colFactory({
    text: 'Date',
    // renderer: compactDateRenderer(),
    width: 100
});