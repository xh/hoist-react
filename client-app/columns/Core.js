/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */
import {fileColFactory} from './Utils.js';

const colFactory = fileColFactory({
    xhId: null,
    dataIndex: null
});

export const baseCol = colFactory();

export const boolCheckCol = colFactory({
    align: 'center',
    width: 34,
    xhExportRenderer: val => !!val
});

export const glyphCol = colFactory({
    dataIndex: 'glyph',
    text: '',
    width: 40,
    align: 'center',
    renderer: (v) => v,
    xhExportRenderer: false
});

export const emptyFlex = colFactory({
    xhId: 'emptyFlex',
    text: '',
    flex: 1,
    minWidth: 1,
    resizable: false,
    sortable: false,
    draggable: false,
    xhExcludeFromChooser: true,
    xhExportRenderer: false
});