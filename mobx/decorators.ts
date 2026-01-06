/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {upperFirst} from 'lodash';

/**
 * Decorator to mark a property as observable and also provide a simple MobX action of the
 * form `setPropName()`.
 *
 * This decorator is especially useful for creating observable properties that are intended to be
 * bound to UI components that will both display and set the property.
 *
 * Use `@bindable.ref` for a version of the function that will mark the property as observable by
 * reference. This will use the similarly named `@observable.ref` decorator in the core MobX API.
 */
export const bindable: any = (target, property, descriptor) => {
    return createBindable(target, property, descriptor, false);
};

bindable.ref = function (target, property, descriptor) {
    return createBindable(target, property, descriptor, true);
};

//-----------------
// Implementation
//-----------------
function createBindable(target, name, descriptor, isRef) {
    // 1) Set up a set function, on the prototype, if one does not exist.
    // This is the original side effect of bindable, used for backward compat by `setBindable`
    const setterName = 'set' + upperFirst(name);
    if (!target.hasOwnProperty(setterName)) {
        const value = function (v) {
            this[name] = v;
        };
        Object.defineProperty(target, setterName, {value});
    }

    // 2) Record on class, so we can later create on *instance* in makeObservable.
    // (Be sure to create cloned list since this will exist on prototype superclasses of this class)
    const key = '_xhBindableProperties';
    if (!target.hasOwnProperty(key)) {
        target[key] = {...target[key]};
    }
    target[key][name] = {isRef};

    // 3) Return original descriptor.
    return descriptor;
}
