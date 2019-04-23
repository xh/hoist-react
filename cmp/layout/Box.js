/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {merge, castArray} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div} from './Tags';

import './Layout.scss';

/**
 * Core building blocks for application layouts.
 *
 * Box is the component that provides the core implementation of the {@see LayoutSupport} mixin.
 * It renders a div and merges all layout props to that div's `style` property.
 *
 * VBox and HBox variants support internal vertical (column) and horizontal (row) flex layouts.
 */
@HoistComponent
@LayoutSupport
export class Box extends Component {
    render() {
        let {children, ...props} = this.getNonLayoutProps();
        props = merge(
            {style: this.getLayoutProps()},
            props
        );

        return div({
            ...props,
            items: castArray(children)
        });
    }
}

@HoistComponent
@LayoutSupport
export class VBox extends Component {
    baseClassName = 'xh-vbox';
    render() {
        return box({
            ...this.props,
            className: this.getClassName()
        });
    }
}

@HoistComponent
@LayoutSupport
export class HBox extends Component {
    baseClassName = 'xh-hbox';
    render() {
        return box({
            ...this.props,
            className: this.getClassName()
        });
    }
}

export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);
