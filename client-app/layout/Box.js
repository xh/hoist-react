/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist';
import {isNumber, forOwn, isEmpty} from 'lodash';

const div = elemFactory('div');

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
 * See also VBox, HBox, Spacer and Filler.  These components provide a Box
 * component with various useful defaults.
 */
export function Box(props) {
    return div(getProps(props));
}

export function VBox(props) {
    return div(getProps(props,  {flexDirection: 'column'}));
}

export function HBox(props) {
    return div(getProps(props, {flexDirection: 'row'}));
}

export function Spacer(props) {
    return div(getProps(props));
}

export function Filler(props) {
    return div(getProps(props, {flex: '1 1 auto'}));
}

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser
 */
export function Viewport(props) {
    return div(getProps(props, {
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        position: 'fixed'
    }));
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
const dimFragments = ['margin', 'padding', 'height', 'width'];
const flexVals = ['flex', 'flexGrow', 'flexShrink'];

function getProps(props, defaultProps = {}) {
    const ret = Object.assign({display: 'flex'}, defaultProps, props);

    // 1) Convert raw 'flex' number to string
    flexVals.forEach(k => {
        const val = props[k];
        if (isNumber(val)) ret[k] = val.toString();
    });

    // 2) Translate raw dimensions to pixels
    forOwn(props, (val, key) => {
        const k = key.toLowerCase();
        if (isNumber(val) && dimFragments.some(it => k.includes(it))) {
            ret[k] = val + 'px';
        }
    });

    // 3) Move properties of interest to 'style'
    const style = ret.style || {};
    styleKeys.forEach(k => {
        const val = ret[k];
        if (val !== undefined) {
            style[k] = val;
            delete ret[k];
        }
    });
    if (!isEmpty(style)) {
        ret.style = style;
    }

    return ret;
}