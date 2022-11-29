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

    // 1) Set up a set function, if one does not exist.  This was the original side-effect of
    // bindable and still used for backward compatibility by HoistBase.setBindable.
    const setterName = 'set' + upperFirst(name);
    if (!target.hasOwnProperty(setterName)) {
        const value = function(v) {
            this[name] = v;
        };
        Object.defineProperty(target, setterName, {value});
    }

    // 2) return a get/set pair that wraps a boxed observable.
    const {initializer} = descriptor,
        getBox = (obj) => getOrCreate(obj, `_${name}_bindable`, () => {
            const initVal = initializer?.call(obj);
            return isRef ? observable.box(initVal, {deep: false}) : observable.box(initVal);
        });

    return {
        get() {
            return getBox(this).get();
        },
        set(v) {
            runInAction(() => getBox(this).set(v));
        },
        configurable: true
    };
}