/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {warnIf, throwIf} from '@xh/hoist/utils/js';
import {partition, isString} from 'lodash';

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
export function multiFieldRenderer(value, context) {
    const {column} = context,
        {multiFieldConfig} = column;

    throwIf(!multiFieldConfig, 'Columns using multiFieldRenderer must specify a multiFieldConfig');
    warnIf(!column.rowHeight, 'MultiFieldRenderer works best with rowHeight: Grid.MULTIFIELD_ROW_HEIGHT');

    const {mainRenderer, delimiter, subFields = []} = multiFieldConfig,
        [topFields, bottomFields] = partition(subFields, it => it.position == 'top'),
        containerEl = document.createElement('div'),
        topEl = document.createElement('div'),
        bottomEl = document.createElement('div');

    // Create container
    containerEl.classList.add('xh-multifield-renderer');
    containerEl.appendChild(topEl);
    containerEl.appendChild(bottomEl);

    // Render main field to top row
    topEl.classList.add('xh-multifield-renderer-row', 'xh-multifield-renderer-top');
    topEl.appendChild(renderMainField(value, mainRenderer, context));

    // Render SubFields to top row
    topFields.forEach(it => {
        if (delimiter) topEl.appendChild(renderDelimiter(delimiter));
        topEl.appendChild(renderSubField(it, context));
    });

    // Render SubFields to bottom row
    bottomEl.classList.add('xh-multifield-renderer-row', 'xh-multifield-renderer-bottom');
    bottomFields.forEach((it, idx) => {
        if (delimiter && idx > 0) bottomEl.appendChild(renderDelimiter(delimiter));
        bottomEl.appendChild(renderSubField(it, context));
    });

    return containerEl;
}

//------------------
// Implementation
//------------------
function renderMainField(value, renderer, context) {
    const {column} = context,
        fieldEl = document.createElement('div');

    fieldEl.classList.add('xh-multifield-renderer-field');
    fieldEl.innerHTML = renderValue(value, renderer, column, context);
    return fieldEl;
}

function renderSubField({colId, label}, context) {
    const {record, gridModel} = context,
        column = gridModel.findColumn(gridModel.columns, colId);

    throwIf(!column, `Subfield ${colId} not found`);

    const {field, headerName, renderer} = column,
        value = record[field],
        fieldEl = document.createElement('div');

    if (label && !isString(label)) label = headerName;

    fieldEl.classList.add('xh-multifield-renderer-field');
    fieldEl.innerHTML = (label ? `${label}: ` : '') + renderValue(value, renderer, column, context);
    return fieldEl;
}

function renderValue(value, renderer, column, context) {
    let ret = value;
    if (renderer) ret = renderer(value, {...context, column});
    return ret;
}

function renderDelimiter(delimiter) {
    const delimiterEl = document.createElement('span');
    delimiterEl.classList.add('xh-multifield-renderer-delimiter');
    delimiterEl.innerHTML = delimiter;
    return delimiterEl;
}