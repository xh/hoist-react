/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {applyMixin} from './ClassUtils';

/**
 * @private
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
