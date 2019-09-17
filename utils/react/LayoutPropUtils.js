/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {pick, isNumber, isString, forOwn, omit, isEmpty} from 'lodash';


/**
 * These utils support accepting the CSS styles enumerated below as top-level props of a Component,
 * and are typically accessed via the `@LayoutSupport` mixin (for class-based components) or the
 * `useLayoutProps()` Hook (for function components).
 *
 * Any supported properties will be extracted from the overall props bundle and returned from
 * `getLayoutProps()`. The contrasting `getNonLayoutProps()` will output all other props _not_
 * included in this list, useful when e.g. relaying unrelated props to a child component without
 * also sending down unwanted/unexpected layout-related keys.
 *
 * The following properties are supported:
 *     margin, marginTop, marginRight, marginBottom, marginLeft,
 *     padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
 *     height, minHeight, maxHeight, width, minWidth, maxWidth,
 *     flex, flexBasis, flexDirection, flexGrow, flexShrink, flexWrap,
 *     alignItems, alignSelf, alignContent, justifyContent,
 *     overflow, overflowX, overflowY,
 *     top, left, position, display
 *
 * NOTE - this system relies on Components respecting and responding to these properties.
 * Component authors must ensure they do, typically by spreading the extracted props onto a
 * child component that also implements LayoutSupport. `Box` is typically the Hoist layout Component
 * that is ultimately rendered and will actually implement this system by outputting a div with
 * appropriate styles set.
 */

/**
 * Return all layout related props found in props.
 *
 * This method implements some minor translations, to allow a more user friendly specification than
 * that afforded by the underlying flexbox styles. In particular, it accepts flex and sizing props
 * as raw numbers rather than strings.
 */
export function getLayoutProps(props) {

    // Harvest all keys of interest
    const ret = pick(props, allKeys);

    // flexXXX: convert raw number to string
    const flexConfig = pick(ret, flexKeys);
    forOwn(flexConfig, (v, k) => {
        if (isNumber(v)) ret[k] = v.toString();
    });

    // Dimensions: translate numbers / bare strings into pixels.
    const dimConfig = pick(ret, dimKeys);
    forOwn(dimConfig, (v, k) => {ret[k] = toPx(v)});

    // Extra handling for margin and padding to support TLBR multi-value strings.
    if (ret.margin) ret.margin = toTlbrPx(ret.margin);
    if (ret.padding) ret.padding = toTlbrPx(ret.padding);

    return ret;
}

/**
 * Return all non-layout related props found in props.
 */
export function getNonLayoutProps(props) {
    return omit(props, allKeys);
}


/**
 * Split a set of props into layout and non-layout props.
 */
export function splitLayoutProps(props) {
    const layoutProps = getLayoutProps(props);
    return [
        layoutProps,
        isEmpty(layoutProps) ? props : getNonLayoutProps(props)
    ];
}


//-------------------------
// Keys to be processed
//-------------------------
const dimKeys = [
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'height', 'minHeight', 'maxHeight',
    'width', 'minWidth', 'maxWidth'
];
const flexKeys = ['flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap'];
const alignKeys = ['alignItems', 'alignSelf', 'alignContent', 'justifyContent'];
const overflowKeys = ['overflow', 'overflowX', 'overflowY'];
const otherKeys = ['top', 'left', 'position', 'display'];
const allKeys = [...dimKeys, ...flexKeys, ...alignKeys, ...overflowKeys, ...otherKeys];


//------------------------
// Implementation
//------------------------
const toPx = (v) => {
    // Note isFinite() is native JS - not _.isFinite() - true for numbers + numbers-strings.
    return isFinite(v) ? `${v}px` : v;
};

const toTlbrPx = (v) => {
    return isString(v) ? v.split(' ').map(side => toPx(side)).join(' ') : toPx(v);
};
