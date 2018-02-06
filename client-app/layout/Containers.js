/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist';
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
export function Box(props) {
    return createDiv(props);
}

export function VBox(props) {
    return createDiv(props,  {flexDirection: 'column'});
}

export function HBox(props) {
    return createDiv(props, {flexDirection: 'row'});
}


/**
 * A Box class that flexes to grow and stretch within its *own* parent.
 *
 * This class is useful for creating nested layouts.  See also VFrame, and HFrame.
 */
export function Frame(props) {
    return createDiv(props, {flex: 'auto'});
}

export function VFrame(props) {
    return createDiv(props, {flex: 'auto', flexDirection: 'column'});
}

export function HFrame(props) {
    return createDiv(props, {flex: 'auto', flexDirection: 'row'});
}

/**
 * A component useful for inserting fixed spacing along the main axis of its
 * parent container.
 */
export function Spacer(props) {
    return createDiv(props, {flex: 'none'});
}

/**
 * A component useful for stretching to soak up space along the main axis of its
 * parent container.
 */
export function Filler(props) {
    return createDiv(props, {flex: 'auto'});
}

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser
 */
export function Viewport(props) {
    return createDiv(props, {
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        position: 'fixed'
    });
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
    const props = Object.assign({display: 'flex'}, defaultProps, appProps);

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
    const style = props.style || {};
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