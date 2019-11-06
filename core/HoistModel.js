/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {ReactiveSupport, ManagedSupport, XhIdSupport} from './mixins';
import {applyMixin} from '@xh/hoist/utils/js';
import {isString, isFunction} from 'lodash';


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
            }
        }
    });
}


