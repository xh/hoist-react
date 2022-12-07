/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {upperFirst} from 'lodash';
import {observable, runInAction} from 'mobx';
import {apiDeprecated, getOrCreate} from '../utils/js';


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
export function bindable(target, property, descriptor) {
    return createBindable(target, property, descriptor, false);

}

bindable.ref = function(target, property, descriptor) {
    return createBindable(target, property, descriptor, true);
};

//-----------------
// Implementation
//-----------------
function createBindable(target, name, descriptor, isRef) {

    // 1) Set up a set function, on the prototype, if one does not exist.
    // The original side effect of bindable, used for backward compat. by HoistBase.setBindable.
    const setterName = 'set' + upperFirst(name);
    if (!target.hasOwnProperty(setterName)) {
        const value = function(v) {
            this[name] = v;
        };
        Object.defineProperty(target, setterName, {value});
    }

    // 2) Place a hidden getter that wraps a boxed observable on the prototype.
    // This will be the backing observable.
    const {initializer} = descriptor,
        propName = `_${name}_bindable`,
        valName = `_${name}_bindable_value`;
    Object.defineProperty(
        target,
        propName, {
            get() {
                return getOrCreate(this, valName, () => {
                    const initVal = initializer?.call(this);
                    return isRef ? observable.box(initVal, {deep: false}) : observable.box(initVal);
                });
            }
        }
    );

    // 3) Record this property, so we can create the public getter in makeObservable()
    // Be sure to create list for *this* particular class. Clone and include inherited values.
    const key = '_xhBindableProperties';
    if (!target.hasOwnProperty(key)) {
        target[key] = [...(target[key] ?? [])];
    }
    target[key].push(name);
    return {};
}


/**
 * Decorator to add a simple MobX action of the form `setPropName()` to a class.
 *
 * Applications that wish to add custom logic to their setter should define one manually instead.
 * If the setter is already defined, this call will be a no-op.
 *
 * Modelled after approach in https://github.com/farwayer/mobx-decorators.
 */
export function settable(target, property, descriptor) {
    const name = 'set' + upperFirst(property);

    apiDeprecated('settable', {
        v: 'v56',
        message: `Consider using @bindable or implement a simple '${name}' method instead.`
    });

    if (!target.hasOwnProperty(name)) {
        const value = function(v) {
            runInAction(() => {this[property] = v});
        };
        Object.defineProperty(target, name, {value});
    }

    return descriptor && {...descriptor, configurable: true};
}
