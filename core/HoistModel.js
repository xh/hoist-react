/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {EventSupport, ReactiveSupport, ManagedSupport, XhIdSupport} from './mixins';
import {applyMixin} from '@xh/hoist/utils/js';


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
 * register the model with the nearest ResfreshContextModel for subsequent refreshes.
 *
 * @see LoadSupport
 */
export function HoistModel(C) {
    return applyMixin(C, {
        name: 'HoistModel',
        includes: [ManagedSupport, EventSupport, ReactiveSupport, XhIdSupport]
    });
}


