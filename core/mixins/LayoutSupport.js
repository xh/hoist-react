/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {provideMethods, defaultMethods} from '@xh/hoist/utils/ClassUtils';
import {pick, isNumber, merge, forOwn} from 'lodash';

/**
 * This mixin provides support for flexbox related styles that are set as top-level properties
 * on a component.  These styles are parsed, and bundled into a single map prop -- 'layoutConfig'.
 *
 * The following properties will be supported:
 *      margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
 *     'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
 *     'height', 'minHeight', 'maxHeight','width', 'minWidth', 'maxWidth',
 *     'flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap',
 *     'alignItems', 'alignSelf', 'alignContent', 'justifyContent',
 *     'overflow', 'overflowX', 'overflowY',
 *     'top', 'left', 'position', 'display'
 *
 * This mixin also promises that the Component will respect and respond to these
 * properties.  See Box for an example of a Component that does this via rendering of
 * a div with appropriate styles.  Other components will typically delegate
 * this responsibility to a child component that also implements LayoutSupport.
 *
 * Note: This mixin relies on preprocessing triggered by elem() for its implementation.
 * Passing layout props directly to the component via JSX is not supported.
 */
export function LayoutSupport(C) {

    C.hasLayoutSupport = true;


    C.processElemProps = (config) => {
        // 1) Harvest, remove, and process all keys of interest
        const layoutConfig = pick(config, allKeys);
        forOwn(layoutConfig, (v, k) => delete config[k]);

        // 1a) flexXXX: convert raw number to string
        const flexConfig = pick(layoutConfig, flexKeys);
        forOwn(flexConfig, (v, k) => {
            if (isNumber(v)) layoutConfig[k] = v.toString();
        });

        // 1b) Dimensions: Translate raw into pixels
        const dimConfig = pick(layoutConfig, dimKeys);
        forOwn(dimConfig, (v, k) => {
            if (isNumber(v)) layoutConfig[k] = v + 'px';
        });

        // 2) Apply this config on top of any config passed in
        config.layoutConfig = config.layoutConfig ? merge(config.layoutConfig, layoutConfig) : layoutConfig;
    }
   
    // Instance methods
    provideMethods(C, {

        /**
         * Shortcut for 'this.props.layoutConfig'.
         *
         * Bundle of parsed props produced by this mixin.
         */
        layoutConfig: {
            get() {return this.props.layoutConfig}
        }
    });
    return C;
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