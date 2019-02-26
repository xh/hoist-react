/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {chainMethods, defaultMethods, markClass} from '@xh/hoist/utils/js';

/**
 * Mixin to support "managed" instances and propeties
 *
 * Managed instances are assumed to hold objects that are created by the referencing object and
 * should be destroyed when the referencing object is destroyed.  See markManaged()
 *
 * Managed properties are a convenience for properties assumed to hold managed instances.  In this case,
 * the object held by that property should be destroyed when the referencing object is destroyed.
 * See @managed.
 */
export function ManagedSupport(C) {
    markClass(C, 'hasManagedSupport');

    defaultMethods(C, {
        /**
         * Mark an object for destruction when this object is destroyed.
         * @param {object} obj - object to be destroyed
         * @returns object passed.
         */
        markManaged(obj) {
            this._xhManagedInstances = this._xhManagedInstances || [];
            this._xhManagedInstances.push(obj);
            return obj;
        }
    });


    chainMethods(C, {
        destroy() {
            const props = this._xhManagedProperties;
            if (props) props.forEach(p => XH.safeDestroy(this[p]));

            const instances = this._xhManagedInstances;
            if (instances) instances.forEach(o => XH.safeDestroy(o));
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
    target._xhManagedProperties = target._xhManaged || [];
    target._xhManagedProperties.push(property);
    return descriptor;
}
