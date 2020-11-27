/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {applyMixin} from '@xh/hoist/utils/js';

/**
 * Mixin to support "managed" instances and properties
 *
 * Managed instances are assumed to hold objects that are created by the referencing object and
 * should be destroyed when the referencing object is destroyed.  See markManaged()
 *
 * Managed properties are a convenience for properties assumed to hold managed instances.  In this case,
 * the object held by that property should be destroyed when the referencing object is destroyed.
 * See @managed.
 */
export function ManagedSupport(C) {
    return applyMixin(C, {
        name: 'ManagedSupport',

        defaults: {
            /**
             * Mark one or more objects for destruction when this object is destroyed.
             *
             * @param {(Object|Array)} obj - object or array of objects to be destroyed
             * @returns obj
             */
            markManaged(obj) {
                this._xhManagedInstances = this._xhManagedInstances ?? [];
                this._xhManagedInstances.push(obj);
                return obj;
            }
        },

        chains: {
            destroy() {
                this._xhManagedProperties?.forEach(p => {
                    XH.safeDestroy(this[p]);
                });
                this._xhManagedInstances?.forEach(i => {
                    XH.safeDestroy(i);
                });
            }
        }
    });
}

/**
 * Decorator to make a property "managed". Managed properties are designed to hold objects that
 * are created by the referencing object and that implement a `destroy()` method to be called
 * via {@see ManagedSupport} when the referencing object is destroyed.
 */
export function managed(target, property, descriptor) {
    target._xhManagedProperties = target._xhManagedProperties ?? [];
    target._xhManagedProperties.push(property);
    return descriptor;
}
