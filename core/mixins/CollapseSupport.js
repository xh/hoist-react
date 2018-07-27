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
 * responding to the 'collapsed' prop.
 *
 * See Panel for the canonical implementation of this behavior.
 * Most Application Components implementing CollapseSupport will simply
 * delegate to Panel.
 */
export function CollapseSupport(C) {

    C.hasCollapseSupport = true;

    // Instance methods
    defaultMethods(C, {

        /**
         * Should this component be displayed as collapsed on a given side?
         *
         * Valid values include 'top', 'left', 'right', and 'bottom', true, and
         * false.  A value of true will yield a component-specific default side.
         *
         * For values of 'top' and 'bottom', this component should be prepared
         * to render in a relatviely thin horizontal rectangle.
         * For values of 'left' and 'right', this component should be prepared
         * to render in a relatively narrow vertical bar.

         */
        collapsed: {
            get() {return this.props.collapsed}
        },


        /**
         * Callback to call when the collapsed state of this object is changed.
         */
        onCollapsedChange: {
            get() {return this.props.onCollapsedChange}
        }

    });
    return C;
}