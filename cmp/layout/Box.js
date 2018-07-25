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
 * Box is the component that provides the core implementation of the LayoutSupport
 * mixin it renders a div that publishes the properties in 'layoutConfig' down to
 * the div's 'style' property.
 */
@HoistComponent()
@LayoutSupport
export class Box extends Component {
    render() {
        let {isCollapsed, children, layoutConfig, ...props} = this.props;
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
    render() {
        return box({flexDirection: 'column', ...this.props});
    }
}

@HoistComponent()
@LayoutSupport
export class HBox extends Component {
    render() {
        return box({flexDirection: 'row', ...this.props});
    }
}
export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);
