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
import {vbox, hbox, span} from '@xh/hoist/cmp/layout';

/**
 * Renders a collection of additional sub fields in a row beneath the main column field.
 * Typically not used directly - instead applied automatically to Grids with subFields.
 *
 * @private
 */
@HoistComponent
export class SubFieldRenderer extends Component {

    static propTypes = {
        /** Array of SubField specifications to render */
        fields: PT.arrayOf(PT.object),
        /** Primary value to render */
        value: PT.oneOfType([PT.string, PT.number, PT.bool]).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.instanceOf(Record).isRequired,
        /** Reference to the Column */
        column: PT.object.isRequired,
        /** Renderer for primary field. */
        renderer: PT.func
    };

    render() {
        const {fields = [], value, record, column, renderer} = this.props;

        return vbox({
            className: 'xh-subfield-renderer',
            items: [
                span({
                    className: 'xh-subfield-renderer-top',
                    item: renderer ? renderer(value, {record, column}) : value
                }),
                hbox({
                    omit: !fields.length,
                    className: 'xh-subfield-renderer-bottom',
                    items: fields.map((it, idx) => this.renderBottomRowField(it))
                })
            ]
        });
    }

    renderBottomRowField({label, field, renderer}) {
        const {record, column} = this.props,
            value = record[field];

        return hbox({
            className: 'xh-subfield-renderer-bottom-field',
            items: [
                label ? span(`${label}:`) : null,
                span(renderer ? renderer(value, {record, column}) : value)
            ]
        });
    }

}

export const subFieldRenderer = elemFactory(SubFieldRenderer);