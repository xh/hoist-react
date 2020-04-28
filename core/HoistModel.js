/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ManagedSupport, ReactiveSupport, XhIdSupport} from '@xh/hoist/core';
import {applyMixin, throwIf} from '@xh/hoist/utils/js';
import {isFunction, isString, upperFirst} from 'lodash';

/**
 * Core decorator for State Models in Hoist.
 *
 * All State models in Hoist applications should typically be decorated with this function.
 * Adds support for managed events and mobx reactivity.
 *
 * A common use of HoistModel is to serve as a backing store for a HoistComponent.  Furthermore, if
 * a model is *created* by a HoistComponent it is considered to be 'owned' (or "hosted") by that
 * component.  An owned model will be automatically destroyed when its component is unmounted.
 *
 * For HoistModels that need to load/refresh data consider implementing LoadSupport.
 * This decorator will load data into the model when its component is first mounted, and will
 * register the model with the nearest RefreshContextModel for subsequent refreshes.
 *
 * @see LoadSupport
 */
export function HoistModel(C) {
    return applyMixin(C, {
        name: 'HoistModel',
        includes: [ManagedSupport, ReactiveSupport, XhIdSupport],

        provides: {
            matchesSelector(selector) {
                if (isFunction(selector)) return selector.isHoistModel ? this instanceof selector : selector(this);
                if (isString(selector)) return !!this['is' + selector];
                return false;
            },

            /**
             * Set an observable/bindable value.
             *
             * This method is a convenience method for calling the conventional setXXX method
             * for updating a mobx observable given the property name.
             *
             * @param {string} prop
             * @param {*} value
             */
            setBindable(prop, value) {
                const setter = `set${upperFirst(prop)}`;
                throwIf(!isFunction(this[setter]),
                    `Required function '${setter}()' not found on bound model. ' +
                    'Implement a setter, or use the @bindable annotation.`
                );
                this[setter](value);
            }
        }
    });
}


