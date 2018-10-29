/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Record} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {vbox, hbox, span} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

import {SubField} from './SubField';

/**
 * Renders a collection of additional sub fields in a row beneath the main column field.
 * Typically not used directly - instead created by using the MultiFieldRenderer elementRendererFn.
 * @private
 */
@HoistComponent
class MultiFieldRenderer extends Component {

    static propTypes = {
        /** Primary value to render */
        value: PT.oneOfType([PT.string, PT.number, PT.bool]).isRequired,
        /** The data Record to render. */
        record: PT.instanceOf(Record).isRequired,
        /** Reference to the Column */
        column: PT.object.isRequired,
        /** Reference to the GridModel. */
        gridModel: PT.instanceOf(GridModel).isRequired,
        /** Array of SubField specifications to render */
        subFields: PT.arrayOf(PT.object),
        /** Renderer for primary field. */
        mainRenderer: PT.func,
        /** Element renderer for primary field (returns a React component) */
        mainElementRenderer: PT.func
    };

    render() {
        const {value, column, mainRenderer, mainElementRenderer} = this.props,
            subFields = this.getSubFields(),
            hasSubFields = !!subFields.length;

        // Set rowHeight on column
        column.rowHeight = hasSubFields ? 38 : undefined;

        return vbox({
            className: hasSubFields ? 'xh-multifield-renderer' : '',
            items: [
                span({
                    className: 'xh-multifield-renderer-top',
                    item: this.renderValue(value, mainRenderer, mainElementRenderer)
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
        const {record, gridModel} = this.props,
            column = gridModel.findColumn(gridModel.columns, colId);

        throwIf(!column, `Subfield ${colId} not found`);

        const {field, headerName, renderer, elementRenderer} = column,
            value = record[field];

        return hbox({
            className: 'xh-multifield-renderer-bottom-field',
            items: [
                label ? span(`${headerName}:`) : null,
                span(this.renderValue(value, renderer || elementRenderer))
            ]
        });
    }

    renderValue(value, renderer) {
        const {record, column, agParams, gridModel} = this.props;
        let ret = value;
        if (renderer) ret = renderer(value, {record, column, agParams, gridModel});
        return ret;
    }

    getSubFields() {
        const {subFields = []} = this.props;
        return subFields.map(it => {
            if (it instanceof SubField) return it;
            return SubField(it);
        });
    }

}

export const multiFieldRenderer = elemFactory(MultiFieldRenderer);