/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {CellContext, Column, ColumnRenderer} from '@xh/hoist/cmp/grid';
import {div, span} from '@xh/hoist/cmp/layout';
import {throwIf, warnIf, intersperse} from '@xh/hoist/utils/js';
import {isFunction, isNil, partition, pull} from 'lodash';
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
export function multiFieldRenderer(value: any, context: CellContext): ReactNode {
    const {column} = context,
        {multiFieldConfig} = column.appData;

    throwIf(!multiFieldConfig, 'Columns using multiFieldRenderer must specify a multiFieldConfig');
    warnIf(
        !column.rowHeight,
        'MultiFieldRenderer works best with rowHeight: Grid.MULTIFIELD_ROW_HEIGHT'
    );

    const {mainRenderer, delimiter, subFields = []} = multiFieldConfig,
        [topFields, bottomFields] = partition(subFields, it => it.position === 'top');

    // Render main field and subfields to top row
    let topRowItems: ReactNode[] = [
        renderMainField(value, mainRenderer, context),
        ...topFields.map(it => renderSubField(it, context))
    ];
    pull(topRowItems, null);

    // Render subfield to bottom row
    let bottomRowItems: ReactNode[] = bottomFields.map(it => renderSubField(it, context));
    pull(bottomRowItems, null);

    // Insert delimiter if applicable
    if (delimiter) {
        topRowItems = intersperse(topRowItems, renderDelimiter(delimiter));
        bottomRowItems = intersperse(bottomRowItems, renderDelimiter(delimiter));
    }

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

    /**
     * Label to display next to data value.
     *
     * True to use the Column's header as label, or string.  For a dynamic, row-specific
     * value, a ColumnRenderer may be provided.
     */
    label?: boolean | 'string' | ColumnRenderer;

    /** Where to render the sub-field. Default 'bottom'. */
    position?: 'top' | 'bottom';
}

//------------------
// Implementation
//------------------
function renderMainField(value: any, renderer: ColumnRenderer, context: CellContext) {
    const {column} = context;
    return div({
        className: 'xh-multifield-renderer-field',
        item: renderValue(value, renderer, column, context)
    });
}

function renderSubField({colId, label}: MultiFieldSubField, context: CellContext) {
    const {record, gridModel} = context,
        column = gridModel.getColumn(colId);

    throwIf(!column, `Subfield ${colId} not found`);

    const {field, headerName, renderer} = column,
        value = record.data[field];

    let labelStr;
    if (isFunction(label)) {
        labelStr = label(value, context);
    } else if (label === true) {
        labelStr = headerName;
    } else {
        labelStr = label;
    }

    const renderedVal = renderValue(value, renderer, column, context),
        renderedValIsEmpty = renderedVal === '' || isNil(renderedVal);

    return renderedValIsEmpty
        ? null
        : div({
              className: 'xh-multifield-renderer-field',
              items: [labelStr ? `${labelStr}: ` : null, renderedVal]
          });
}

function renderValue(value: any, renderer: ColumnRenderer, column: Column, context: CellContext) {
    const ret = renderer ? renderer(value, {...context, column}) : value;
    return isNil(ret) ? null : ret;
}

function renderDelimiter(delimiter: string) {
    return span({
        className: 'xh-multifield-renderer-delimiter',
        item: delimiter
    });
}
