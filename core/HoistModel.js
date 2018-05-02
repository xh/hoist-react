/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {EventTarget, Reactive} from './mixins';


/**
 * Core decorator for State Models in Hoist.
 *
 * All State models in Hoist applications should typically be decorated with
 * this function.  It provides basic functionality for managed events and mobx
 * reactivity.
 */
export function HoistModel() {

    return function (C) {
        C.isHoistModel = true;

        C = EventTarget(C);
        C = Reactive(C);

        return C;
    }
}
