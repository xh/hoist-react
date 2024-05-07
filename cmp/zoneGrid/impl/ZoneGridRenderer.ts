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
 * Requires the column to also specify a zoneGridConfig in its `appData`.
 *
 * The configs `subFields` act as pointers to other columns that exist in the GridModel's columns collection
 * (often hidden). They will be rendered using the same rendererFn, headerName and value as the column
 * they refer to.
 */
export function zoneGridRenderer(value: any, context: CellContext): ReactNode {
    const {column} = context,
        {zoneGridConfig} = column.appData;

    throwIf(!zoneGridConfig, 'Columns using zoneGridRenderer must specify a zoneGridConfig');
    warnIf(
        !column.rowHeight,
        'ZoneGridRenderer works best with rowHeight: Grid.ZONEGRID_ROW_HEIGHT'
    );

    const {mainRenderer, delimiter, subFields = []} = zoneGridConfig as ZoneGridConfig,
        [topFields, bottomFields] = partition(subFields, it => it.position === 'top');

    // Render main field and subfields to top row
    let topSectionItems: ReactNode[] = [
        renderMainField(value, mainRenderer, context),
        ...topFields.map(it => renderSubField(it, context))
    ];
    pull(topSectionItems, null);

    // Render subfield to bottom row
    let bottomSectionItems: ReactNode[] = bottomFields.map(it => renderSubField(it, context));
    pull(bottomSectionItems, null);

    // Insert delimiter if applicable
    if (delimiter) {
        topSectionItems = intersperse(topSectionItems, renderDelimiter(delimiter));
        bottomSectionItems = intersperse(bottomSectionItems, renderDelimiter(delimiter));
    }

    return div({
        className: getStyleClassName(),
        items: [
            div({
                className: `${getStyleClassName('section')} ${getStyleClassName('top')}`,
                items: topSectionItems
            }),
            div({
                className: `${getStyleClassName('section')} ${getStyleClassName('bottom')}`,
                items: bottomSectionItems
            })
        ]
    });
}

export interface ZoneGridConfig {
    /** Array of SubField specifications to render. */
    subFields: ZoneGridSubField[];

    /** Renderer for primary field. */
    mainRenderer?: ColumnRenderer;

    /** string rendered between consecutive SubFields. */
    delimiter?: string;
}

export interface ZoneGridSubField {
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
    const {content, rendererClass} = renderValue(value, renderer, column, context);
    return div({
        className: rendererClass,
        item: content
    });
}

function renderSubField({colId, label}: ZoneGridSubField, context: CellContext) {
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

    const {content, rendererClass} = renderValue(value, renderer, column, context),
        renderedValIsEmpty = content === '' || isNil(content);

    return renderedValIsEmpty
        ? null
        : div({
              className: rendererClass,
              items: [
                  labelStr
                      ? span({item: `${labelStr}:`, className: getStyleClassName('label')})
                      : null,
                  content
              ]
          });
}

function renderValue(
    value: string | number,
    renderer: ColumnRenderer,
    column: Column,
    context: CellContext
): {
    content: ReactNode | null;
    rendererClass: string;
} {
    const ret = renderer ? renderer(value, {...context, column}) : value;
    return {
        content: isNil(ret) ? null : ret,
        rendererClass: ['string', 'number'].includes(typeof ret)
            ? getStyleClassName('text-container')
            : getStyleClassName('element-container')
    };
}

function renderDelimiter(delimiter: string) {
    return span({
        className: getStyleClassName('delimiter'),
        item: delimiter
    });
}

function getStyleClassName(subClass?: string): string {
    return `xh-zonegrid-cell${subClass ? `-${subClass}` : ''}`;
}
