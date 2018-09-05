/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

import {HoistField} from '@xh/hoist/cmp/form/HoistField';

/**
 * A simple label for a form.
 */
@HoistComponent
export class Label extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        children: PT.node
    };

    delegateProps = ['className'];

    baseClassName = 'xh-field-label';

    render() {
        const {children, style, width} = this.props;
        return div({
            className: this.getClassName(),
            style: {...style, whiteSpace: 'nowrap', width},
            items: children,
            ...this.getDelegateProps()
        });
    }
}

export const label = elemFactory(Label);