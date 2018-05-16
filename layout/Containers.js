/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';
import {isNumber, forOwn, isEmpty} from 'lodash';

/**
 * Box is just a very thin wrapper around a div with 'flex' layout.
 *
 * It essentially just promotes flexbox layout related properties in
 * the 'style' property to be top-level properties for convenience.
 *
 * Box also
 *  + Allows use of raw numbers for pixel values of dimensions,
 *  + Allows flex, flexGrow, and flexShrink to be specified as integers.
 *
 * See also VBox, HBox. 
 */

@HoistComponent()
export class Box extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv( ...rest);
    }
}

@HoistComponent()
export class VBox extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flexDirection: 'column'});
    }

}

@HoistComponent()
export class HBox extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flexDirection: 'row'});
    }
}

/**
 * A Box class that flexes to grow and stretch within its *own* parent.
 *
 * This class is useful for creating nested layouts.  See also VFrame, and HFrame.
 */
@HoistComponent()
export class Frame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto'});
    }
}

@HoistComponent()
export class VFrame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto', flexDirection: 'column'});
    }
}

@HoistComponent()
export class HFrame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto', flexDirection: 'row'});
    }
}

/**
 * A component useful for inserting fixed spacing along the main axis of its
 * parent container.
 */
@HoistComponent()
export class Spacer extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'none'});
    }
}

/**
 * A component useful for stretching to soak up space along the main axis of its
 * parent container.
 */
@HoistComponent()
export class Filler extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto'});
    }
}

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser
 */
@HoistComponent()
export class Viewport extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            position: 'fixed'
        });
    }
}

//-----------------------
// Implementation
//-----------------------
const styleKeys = [
    'display',
    'top', 'left', 'position',
    'alignItems', 'alignSelf', 'alignContent',
    'flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap',
    'overflow', 'overflowX', 'overflowY',
    'justifyContent', 'order',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'height', 'minHeight', 'maxHeight',
    'width', 'minWidth', 'maxWidth'
];

const dimFragments = ['margin', 'padding', 'height', 'width'],
    flexVals = ['flex', 'flexGrow', 'flexShrink'],
    div = elemFactory('div');

function createDiv(appProps, defaultProps = {}) {
    const props = Object.assign(
        {display: 'flex', overflow: 'hidden', position: 'relative'},
        defaultProps,
        appProps
    );

    // 1) Convert raw 'flex' number to string
    flexVals.forEach(k => {
        const val = appProps[k];
        if (isNumber(val)) props[k] = val.toString();
    });

    // 2) Translate raw dimensions to pixels
    forOwn(appProps, (val, key) => {
        const k = key.toLowerCase();
        if (isNumber(val) && dimFragments.some(it => k.includes(it))) {
            props[k] = val + 'px';
        }
    });

    // 3) Move properties of interest to 'style'
    const style = Object.assign({}, props.style);
    styleKeys.forEach(k => {
        const val = props[k];
        if (val !== undefined) {
            style[k] = val;
            delete props[k];
        }
    });
    if (!isEmpty(style)) {
        props.style = style;
    }

    return div(props);
}