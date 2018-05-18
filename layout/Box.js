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
 * A Component that supports flexbox-based layout of its contents.
 *
 * Box is the component that implements the flexbox layout properties that
 * are parsed by HoistComponent's 'layoutSupport'.  It renders a div that
 * publishes the properties in 'layoutConfig' down to the div's 'style'
 * property.
 *
 * HoistComponents that provide layoutSupport should typically render a Box
 * at their root (or another component with layoutSupport: true), passing their
 * own layoutConfig to their child as a prop.
 *
 * See also VBox, HBox.
 */
@HoistComponent({layoutSupport: true})
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

@HoistComponent({layoutSupport: true})
export class VBox extends Component {
    render() {
        return box({flexDirection: 'column', ...this.props});
    }
}

@HoistComponent({layoutSupport: true})
export class HBox extends Component {
    render() {
        return box({flexDirection: 'row', ...this.props});
    }
}

export const box = elemFactory(Box);
export const vbox = elemFactory(VBox);
export const hbox = elemFactory(HBox);

