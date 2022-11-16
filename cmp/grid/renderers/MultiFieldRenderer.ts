/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer} from '@xh/hoist/cmp/grid';
import {div, span} from '@xh/hoist/cmp/layout';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {isString, partition} from 'lodash';
import {ReactNode} from 'react';

/**
 * A grid rendererFn that renders a collection of additional SubFields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldConfig in its `appData`.
 *
 * The configs `subFields` act as pointers to other columns that exist in the GridModel's columns collection
 * (often hidden). They will be rendered using the same rendererFn, headerName and value as the column
 * they refer to.
 */
export function multiFieldRenderer(value, context): ReactNode {
    const {column} = context,
        {multiFieldConfig} = column.appData;

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

export interface MultiFieldConfig {
    /** Array of SubField specifications to render. */
    subFields: MultiFieldSubField[];

    /** Renderer for primary field. */
    mainRenderer?: ColumnRenderer;

    /** string rendered between consecutive SubFields. */
    delimiter?: string;
}

export interface MultiFieldSubField {
    colId: string;

    /** True to include the Column's headerName as label, or string. */
    label?: boolean|'string';

    /** Where to render the sub field. Default 'bottom'. */
    position?: 'top'|'bottom';
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
