/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {chainMethods, markClass} from '@xh/hoist/utils/js';

/**
 * Mixin to support "managed" properties.  Managed properties are assumed to hold objects that
 * are created by the refrencing object and should be destroyed when the referencing object is destroyed.
 *
 * See @managed.
 */
export function ManagedSupport(C) {
    markClass(C, 'hasManagedSupport');

    chainMethods(C, {
        destroy() {
            const managed = this._xhManaged;
            if (managed) managed.forEach(f => XH.safeDestroy(this[f]));
        }
    });

    return C;
}

/**
 * Decorator to make a property "managed".  Managed properties are assumed to hold objects that
 * are created by the refrencing object and should be destroyed when the referencing object is destroyed.
 *
 * See @ManagedSupport.
 */
export function managed(target, property, descriptor) {
    target._xhManaged = target._xhManaged || [];
    target._xhManaged.push(property);
    return descriptor;
}
