/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {vbox, hbox, span} from '@xh/hoist/cmp/layout';
import {warnIf, throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

/**
 * Renders a collection of additional sub fields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldConfig, with the following params:
 *
 *      {SubField[]} subFields - Array of SubField specifications to render
 *      {Column~rendererFn} [mainRenderer] - renderer for primary field.
 *      {Column~elementRendererFn} [mainElementRenderer] - elementRenderer for primary field (returns a React component).
 *
 * Typically not used directly - instead created by using the multiFieldRenderer elementRendererFn.
 * @private
 */
@HoistComponent
class MultiFieldCell extends Component {

    static propTypes = {
        /** Primary value to render */
        value: PT.oneOfType([PT.string, PT.number, PT.bool]).isRequired,
        /** CellRendererContext provided by Column.elementRendererFn. */
        context: PT.object.isRequired
    };

    render() {
        const {value, context} = this.props,
            {column} = context,
            {mainRenderer, mainElementRenderer, subFields = []} = this.getMultiFieldConfig(),
            hasSubFields = !!subFields.length;

        // Set rowHeight on column
        warnIf(!column.rowHeight, 'MultiFieldRenderer works best with rowHeight: Grid.MULTIFIELD_ROW_HEIGHT');

        return vbox({
            className: hasSubFields ? 'xh-multifield-renderer' : '',
            items: [
                span({
                    className: 'xh-multifield-renderer-top',
                    item: this.renderValue(value, column, mainRenderer || mainElementRenderer)
                }),
                hbox({
                    omit: !hasSubFields,
                    className: 'xh-multifield-renderer-bottom',
                    items: subFields.map((it, idx) => this.renderBottomRowField(it))
                })
            ]
        });
    }

    //------------------------
    // Implementation
    //------------------------
    renderBottomRowField({colId, label}) {
        const {record, gridModel} = this.props.context,
            column = gridModel.findColumn(gridModel.columns, colId);

        throwIf(!column, `Subfield ${colId} not found`);

        const {field, headerName, renderer, elementRenderer} = column,
            value = record[field];

        if (label && !isString(label)) label = headerName;

        return hbox({
            className: 'xh-multifield-renderer-bottom-field',
            items: [
                label ? span(`${label}:`) : null,
                span(this.renderValue(value, column, renderer || elementRenderer))
            ]
        });
    }

    renderValue(value, column, renderer) {
        let ret = value;
        if (renderer) ret = renderer(value, {...this.props.context, column});
        return ret;
    }

    getMultiFieldConfig() {
        const ret = this.props.context.column.multiFieldConfig;
        throwIf(!ret, 'Columns using multiFieldRenderer must specify a multiFieldConfig');
        return ret;
    }

}

export const multiFieldCell = elemFactory(MultiFieldCell);

/**
 * @typedef {Object} SubField
 * @property {string} colId - Column ID to render
 * @property {boolean|string} label - true to include the Column's headerName as label, or string
 */