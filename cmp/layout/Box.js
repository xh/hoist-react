/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {merge, castArray} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport, layoutSupportProps} from '@xh/hoist/core';
import {div} from './Tags';

/**
 * A Component that supports flexbox-based layout of its contents.
 *
 * Box is the component that provides the core implementation of the LayoutSupport mixin.
 * It renders a div and merges all layout props to that div's `style` property.
 *
 * VBox and HBox variants support internal vertical (column) and horizontal (row) flex layouts.
 */
@HoistComponent
@LayoutSupport
export class Box extends Component {
    static propTypes = {...layoutSupportProps}
    render() {
        let {children, ...props} = this.getNonLayoutProps();
        props = merge(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
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
    static propTypes = {...Box.propTypes}
    baseClassName = 'xh-vbox';
    render() {
        return box({
            ...this.props,
            flexDirection: 'column',
            className: this.getClassName()
        });
    }
}

@HoistComponent
@LayoutSupport
export class HBox extends Component {
    static propTypes = {...Box.propTypes}
    baseClassName = 'xh-hbox';
    render() {
        return box({
            ...this.props,
            flexDirection: 'row',
            className: this.getClassName()
        });
    }
}

export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);
