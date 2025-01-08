/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {HoistModel, HoistModelClass} from './';
import {isFunction, isString} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Type for use in identifying a model or set of models.  May be one of:
 *
 *  - class (or superclass) to match
 *  - class name (as a string)
 *  - `"*"` to accept any Model
 *  - boolean
 *  - function taking a model and returning any of the above.
 */
export type ModelSelector<T extends HoistModel = HoistModel> =
    | HoistModelClass<T>
    | string
    | boolean
    | ((model: HoistModel) => ModelSelector<T>);

/**
 * Ensure an object is a ModelSelector, or throw.
 */
export function ensureIsSelector(s: any) {
    const isFunc = isFunction(s),
        msg =
            'A valid subclass of HoistModel, a function, or "*" is required as a selector.' +
            'Functional form may take a HoistModel and return a boolean, or take no arguments and ' +
            'return a subclass of HoistModel.';

    // Basic check for non-functions
    throwIf(!isFunc && s !== '*', msg);

    // For functions, can only validate that if it is a class constructor it's a HoistModel
    throwIf(isFunc && s.prototype && !(s as any).isHoistModel, msg);
}

/**
 * Format a ModelSelector for debugging purposes.
 */
export function formatSelector(selector: ModelSelector): string {
    if (isString(selector)) return selector;
    if (isFunction(selector)) {
        let sel: any = selector;
        if (sel.isHoistModel) return sel.name;
        try {
            sel = sel();
        } catch (e) {}
        if (sel.isHoistModel) return '() => ' + sel.name;
    }
    return '[Selector]';
}

/**
 * Parameterized decorator to inject an instance of an ancestor model in the Model lookup
 * hierarchy into this object.
 *
 * The decorated property will be filled only when the Model is linked to the Component hierarchy.
 * Accessing properties decorated with `@lookup` should first be done in the
 * {@link HoistModel.onLinked} or {@link HoistModel.afterLinked} handlers.
 */
export const lookup: any = (selector: ModelSelector) => {
    ensureIsSelector(selector);
    return function (target, property, descriptor) {
        throwIf(
            !target.isHoistModel,
            '@lookup decorator should be applied to a subclass of HoistModel'
        );
        // Be sure to create list for *this* particular class. Clone and include inherited values.
        const key = '_xhInjectedParentProperties';
        if (!target.hasOwnProperty(key)) {
            target[key] = {...target[key]};
        }
        target[key][property] = selector;
        return descriptor;
    };
};
