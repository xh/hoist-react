/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {CellContext, Column, ColumnRenderer} from '@xh/hoist/cmp/grid';
import {div, span} from '@xh/hoist/cmp/layout';
import {intersperse, throwIf} from '@xh/hoist/utils/js';
import {compact, isFunction, isNil, partition} from 'lodash';
import {ReactNode} from 'react';

export interface ZoneGridColConfig {
    /** Array of SubField specifications to render. */
    subFields: ZoneGridSubField[];

    /** Renderer for primary field. */
    mainRenderer?: ColumnRenderer;

    /** Separator rendered between consecutive SubFields. */
    delimiter?: string | false;
}

export interface ZoneGridSubField {
    colId: string;

    /**
     * Label to display next to data value. True to use the Column's header as label.
     * Alternatively provide a custom string, or a renderer for dynamic per-value labels.
     */
    label?: boolean | string | ColumnRenderer;

    /** Where to render the sub-field. Default 'bottom'. */
    position?: 'top' | 'bottom';
}

/**
 * Renderer to support ZoneGrid's highly specialized rendering.
 * @internal
 */
export function zoneGridRenderer(value: any, context: CellContext, isLeft: boolean): ReactNode {
    const {column} = context,
        zoneGridConfig: ZoneGridColConfig = column.appData.zoneGridConfig,
        {mainRenderer, delimiter, subFields = []} = zoneGridConfig,
        [topFields, bottomFields] = partition(subFields, it => it.position === 'top');

    // Render main field and subfields to top row
    let topSectionItems: ReactNode[] = compact([
        renderMainField(value, mainRenderer, context),
        ...topFields.map(it => renderSubField(it, context))
    ]);

    // Render subfield to bottom row
    let bottomSectionItems: ReactNode[] = compact(
        bottomFields.map(it => renderSubField(it, context))
    );

    // Insert delimiter if applicable
    if (delimiter) {
        topSectionItems = intersperse(topSectionItems, renderDelimiter(delimiter));
        bottomSectionItems = intersperse(bottomSectionItems, renderDelimiter(delimiter));
    }

    return div({
        className: getStyleClassName(null, isLeft ? 'left' : 'right'),
        items: [
            div({
                className: getStyleClassName('section', 'top'),
                items: topSectionItems
            }),
            div({
                className: getStyleClassName('section', 'bottom'),
                items: bottomSectionItems
            })
        ]
    });
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

function getStyleClassName(element?: string, modifier?: string): string {
    let ret = `xh-zone-grid-cell${element ? `__${element}` : ''}`;
    return modifier ? `${ret} ${ret}--${modifier}` : ret;
}
