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

/**
 * Todo: comment
 *
 * Typically not used directly, instead used via Column.multiFieldRenderer
 */
@HoistComponent
export class MultiFieldRenderer extends Component {

    baseClassName = 'xh-multi-value-renderer';

    static propTypes = {
        /** Todo: comment */
        value: PT.oneOfType([PT.string, PT.number, PT.bool]).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.instanceOf(Record).isRequired,
        /** Renderer for primary field. */
        renderer: PT.function,
        /** Todo: comment */
        fields: PT.arrayOf(PT.object)
    };

    constructor(props) {
        super(props);
        // Todo: check props
    }

    render() {
        const {value, record, renderer, fields} = this.props;
        console.log(value, record, renderer, fields);
        return value;
    }

}

export const multiFieldRenderer = elemFactory(MultiFieldRenderer);