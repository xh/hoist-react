/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div, span} from '@xh/hoist/cmp/layout';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {isString, partition} from 'lodash';
import { ReactNode } from 'react';

/**
 * A grid rendererFn that renders a collection of additional SubFields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldConfig, with the following params:
 *
 *      {SubField[]} subFields - Array of SubField specifications to render
 *      {Column~rendererFn} [mainRenderer] - renderer for primary field.
 *      {string} [delimiter] - string rendered between consecutive SubFields
 *
 * SubFields act as pointers to other columns that exist in the GridModel's columns collection (often hidden).
 * They will be rendered using the same rendererFn, headerName and value as the column they point to.
 *
 * SubFields are defined as objects with the following props:
 *
 *      {string} colId - Column ID to render.
 *      {boolean|string} [label] - true to include the Column's headerName as label, or string
 *      {string} [position] - Where to render the SubField, either 'top' or 'bottom'. Default 'bottom'
 */
export function multiFieldRenderer(value, context): ReactNode {
    const {column} = context,
        {multiFieldConfig} = column;

    throwIf(!multiFieldConfig, 'Columns using multiFieldRenderer must specify a multiFieldConfig');
    warnIf(!column.rowHeight, 'MultiFieldRenderer works best with rowHeight: Grid.MULTIFIELD_ROW_HEIGHT');

    const {mainRenderer, delimiter, subFields = []} = multiFieldConfig,
        [topFields, bottomFields] = partition(subFields, it => it.position === 'top'),
        topRowItems = [],
        bottomRowItems = [];

    // Render main field to top row
    topRowItems.push(renderMainField(value, mainRenderer, context));

    // Render SubFields to top row
    topFields.forEach(it => {
        if (delimiter) topRowItems.push(renderDelimiter(delimiter));
        topRowItems.push(renderSubField(it, context));
    });

    // Render SubFields to bottom row
    bottomFields.forEach((it, idx) => {
        if (delimiter && idx > 0) bottomRowItems.push(renderDelimiter(delimiter));
        bottomRowItems.push(renderSubField(it, context));
    });

    return div({
        className: 'xh-multifield-renderer',
        items: [
            div({
                className: 'xh-multifield-renderer-row xh-multifield-renderer-top',
                items: topRowItems
            }),
            div({
                className: 'xh-multifield-renderer-row xh-multifield-renderer-bottom',
                items: bottomRowItems
            })
        ]
    });
}

//------------------
// Implementation
//------------------
function renderMainField(value, renderer, context) {
    const {column} = context;
    return div({
        className: 'xh-multifield-renderer-field',
        item: renderValue(value, renderer, column, context)
    });
}

function renderSubField({colId, label}, context) {
    const {record, gridModel} = context,
        column = gridModel.findColumn(gridModel.columns, colId);

    throwIf(!column, `Subfield ${colId} not found`);

    const {field, headerName, renderer} = column,
        value = record.data[field];

    if (label && !isString(label)) label = headerName;

    return div({
        className: 'xh-multifield-renderer-field',
        items: [
            label ? `${label}: ` : null,
            renderValue(value, renderer, column, context)
        ]
    });
}

function renderValue(value, renderer, column, context) {
    return renderer ? renderer(value, {...context, column}) : value;
}

function renderDelimiter(delimiter) {
    return span({
        className: 'xh-multifield-renderer-delimiter',
        item: delimiter
    });
}
