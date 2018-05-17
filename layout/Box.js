/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {merge, castArray} from 'lodash';
import {elemFactory, HoistComponent} from 'hoist/core';
import {div} from './Tags';

/**
 * Box is a div that publishes the flexbox layout related properties in
 * 'xhlayout' down to the dom level 'style' property.
 *
 * Components that wish to support these properties should typically
 * render a Box as their top level element.
 *
 * See also VBox, HBox.
 */
@HoistComponent()
export class Box extends Component {
    render() {
        let {xhlayout, isCollapsed, children, ...props} = this.props;
        props = merge(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
            {style: xhlayout},
            props
        );

        return div({...props, items: castArray(children)});
    }
}

@HoistComponent()
export class VBox extends Component {
    render() {
        return box({flexDirection: 'column', ...this.props});
    }
}

@HoistComponent()
export class HBox extends Component {
    render() {
        return box({flexDirection: 'row', ...this.props});
    }
}

export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);

