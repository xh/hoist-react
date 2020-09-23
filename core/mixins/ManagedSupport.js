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
             * Mark an object for destruction when this object is destroyed.
             * @param {object} obj - object to be destroyed
             * @returns object passed.
             */
            markManaged(obj) {
                this._xhManagedInstances = this._xhManagedInstances ?? [];
                this._xhManagedInstances.push(obj);
                return obj;
            }
        },

        chains: {
            destroy() {
                XH.safeDestroy(this._xhManagedProperties?.map(p => this[p]));
                XH.safeDestroy(this._xhManagedInstances);
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
