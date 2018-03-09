/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {div} from 'hoist/layout';

import {bindableField} from './BindableField';
/**
 * A simple label for a form.
 *
 * @prop children, text to display
 * @prop style
 * @prop className
 * @prop width, width of field, in pixels
 */
@bindableField
@hoistComponent()
export class Label extends Component {

    delegateProps = ['className'];
    
    render() {
        const {children, style, width} = this.props;
        return div({
            cls: 'pt-label pt-inline',
            style: {...style, whiteSpace: 'nowrap', width},
            items: children,
            ...this.getDelegateProps()
        });
    }
}
export const label = elemFactory(Label);