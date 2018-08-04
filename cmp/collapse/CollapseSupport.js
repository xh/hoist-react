/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaultMethods} from '@xh/hoist/utils/ClassUtils';


/**
 * This mixin indicates support for a "collapsed" prop.
 *
 * Components that carry this mixin will behave as a controlled component
 * responding to a CollapseModel.
 *
 * See Panel for the canonical implementation of this behavior.
 * Most application components implementing CollapseSupport will simply
 * delegate to Panel.
 */
export function CollapseSupport(C) {

    C.hasCollapseSupport = true;

    // Instance methods
    defaultMethods(C, {

        /** Model governing collapse behavior of this object. **/
        collapseModel: {
            get() {return this.props.collapseModel}
        }
    });
    return C;
}