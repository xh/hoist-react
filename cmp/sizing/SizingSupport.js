/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaultMethods} from '@xh/hoist/utils/ClassUtils';


/**
 * Components that carry this mixin will behave as a controlled component
 * responding to a SizingModel.
 *
 * See Panel for the canonical implementation of this behavior.
 * Most application components implementing SizingSupport will simply
 * delegate to Panel.
 */
export function SizingSupport(C) {

    C.hasSizingSupport = true;

    defaultMethods(C, {

        /** Model governing sizing behavior of this object. **/
        sizingModel: {
            get() {return this.props.sizingModel}
        }
    });
    return C;
}