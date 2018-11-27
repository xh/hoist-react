/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A simple label for a form.
 */
@HoistComponent
export class Label extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        children: PT.node
    };

    baseClassName = 'xh-input-label';

    render() {
        const {props} = this;
        return div({
            className: this.getClassName('bp3-label', 'bp3-inline'),
            style: {...props.style, whiteSpace: 'nowrap', width: props.width},
            items: props.children
        });
    }
}

export const label = elemFactory(Label);