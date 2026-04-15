/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, HoistModelClass} from './';
import {isFunction, isString} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Type for use in identifying a model or set of models.  May be one of:
 *
 *  - class (or superclass) to match
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
export function lookup(selector: ModelSelector) {
    ensureIsSelector(selector);
    return function (_value: any, context: ClassFieldDecoratorContext) {
        if (context.kind !== 'field') {
            throw new Error(
                `@lookup must be applied to a plain class field (got kind='${context.kind}').`
            );
        }
        const property = String(context.name);
        // The returned initializer runs as part of field initialization — register this property
        // on the class prototype so `useModelLinker` can resolve it at link time.
        // (Babel's 2023-05 decorator pass does not reliably invoke addInitializer callbacks for
        //  field decorators, so we piggyback on the init-return form instead.)
        return function (this: any, initialValue: any) {
            if (!this.isHoistModel) {
                throw new Error('@lookup decorator should be applied to a subclass of HoistModel');
            }
            const proto = Object.getPrototypeOf(this),
                key = '_xhInjectedParentProperties';
            if (!Object.prototype.hasOwnProperty.call(proto, key)) {
                Object.defineProperty(proto, key, {
                    value: {...(proto[key] ?? {})},
                    writable: true,
                    configurable: true,
                    enumerable: false
                });
            }
            proto[key][property] = selector;
            return initialValue;
        };
    };
}
