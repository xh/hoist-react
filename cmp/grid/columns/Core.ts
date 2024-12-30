/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {tagsRenderer} from '../renderers/TagsRenderer';
import {ColumnSpec} from './Column';

/** Column config to render truthy values with a standardized green check icon. */
export const boolCheck: ColumnSpec = {
    width: 34,
    align: 'center',
    resizable: false,
    renderer: v => (v ? Icon.check({prefix: 'fas', intent: 'success'}) : null)
};

export const number: ColumnSpec = {
    align: 'right',
    renderer: numberRenderer({})
};

export const fileExt: ColumnSpec = {
    headerName: '',
    width: 28,
    align: 'center',
    resizable: false,
    renderer: v => (v ? Icon.fileIcon({filename: v, title: v}) : null)
};

export const tags: ColumnSpec = {
    renderer: tagsRenderer
};

// Deprecated aliases with `Col` suffix
export const boolCheckCol = boolCheck;
export const numberCol = number;
export const fileExtCol = fileExt;
