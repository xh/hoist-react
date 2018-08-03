/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {merge, castArray} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div} from './Tags';

/**
 * A Component that supports flexbox-based layout of its contents.
 *
 * Box is the component that provides the core implementation of the LayoutSupport mixin.
 * It renders a div and merges the properties in 'layoutConfig' down to that div's `style` property.
 *
 * VBox and HBox variants support internal vertical (column) and horizontal (row) flex layouts.
 */
@HoistComponent()
@LayoutSupport
export class Box extends Component {
    render() {
        let {collapsed, children, layoutConfig, ...props} = this.props;
        props = merge(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
            {style: layoutConfig},
            props
        );

        return div({...props, items: castArray(children)});
    }
}

@HoistComponent()
@LayoutSupport
export class VBox extends Component {
    baseCls = 'xh-vbox';
    render() {
        return box({
            flexDirection: 'column',
            cls: this.getClassNames(),
            ...this.props
        });
    }
}

@HoistComponent()
@LayoutSupport
export class HBox extends Component {
    baseCls = 'xh-hbox';
    render() {
        return box({
            flexDirection: 'row',
            cls: this.getClassNames(),
            ...this.props
        });
    }
}

export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);
