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
import {Column} from '@xh/hoist/columns';
import {vbox, hbox, span} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Renderers a collection of additional fields in a row beneath the main column field.
 *
 * Fields are specified as an array of:
 *
 *      {string} field - name of data store field to display.
 *      {string} label - display text for field
 *      {Column~rendererFn} renderer - function to produce a formatted string for field.
 *
 * Typically not used directly, instead used via Column.multiFieldRenderer
 */
@HoistComponent
export class MultiFieldRenderer extends Component {

    static propTypes = {
        /** Primary value to render */
        value: PT.oneOfType([PT.string, PT.number, PT.bool]).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.instanceOf(Record).isRequired,
        /** Reference to the Column */
        column: PT.instanceOf(Column).isRequired,
        /** Renderer for primary field. */
        renderer: PT.func,
        /** Array of field specifications to show in bottom row */
        fields: PT.arrayOf(PT.object)
    };

    render() {
        const {value, record, column, renderer, fields = []} = this.props;
        return vbox({
            className: 'xh-multi-field-renderer',
            items: [
                span({
                    className: 'xh-multi-field-renderer-top',
                    item: renderer ? renderer(value, {record, column}) : value
                }),
                hbox({
                    omit: !fields.length,
                    className: 'xh-multi-field-renderer-bottom',
                    items: fields.map((it, idx) => this.renderBottomRowField(it))
                })
            ]
        });
    }

    renderBottomRowField({label, field, renderer}) {
        throwIf(!field, 'MultiFieldRenderer fields collection: property "field" required');

        const {record, column} = this.props,
            value = record[field];

        return hbox({
            className: 'xh-multi-field-renderer-bottom-field',
            items: [
                label ? span(`${label}:`) : null,
                span(renderer ? renderer(value, {record, column}) : value)
            ]
        });
    }

}

export const multiFieldRenderer = elemFactory(MultiFieldRenderer);