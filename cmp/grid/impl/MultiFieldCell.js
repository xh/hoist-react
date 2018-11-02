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

import {SubField} from './SubField';

/**
 * Renders a collection of additional sub fields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldRendererCfg, with the following params:
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
        /** CellRendererMetadata provided by Column.elementRendererFn. */
        rendererMetadata: PT.object.isRequired
    };

    render() {
        const {value, rendererMetadata} = this.props,
            {column} = rendererMetadata,
            {mainRenderer, mainElementRenderer} = this.getMultiFieldRendererCfg(),
            subFields = this.getSubFields(),
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
        const {record, gridModel} = this.props.rendererMetadata,
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
        if (renderer) ret = renderer(value, {...this.rendererMetadata, column});
        return ret;
    }

    getMultiFieldRendererCfg() {
        const ret = this.props.rendererMetadata.column.multiFieldRendererCfg;
        throwIf(!ret, 'Columns using multiFieldRenderer must specify a multiFieldRendererCfg');
        return ret;
    }

    getSubFields() {
        const {subFields = []} = this.getMultiFieldRendererCfg();
        return subFields.map(it => {
            if (it instanceof SubField) return it;
            return new SubField(it);
        });
    }

}

export const multiFieldCell = elemFactory(MultiFieldCell);