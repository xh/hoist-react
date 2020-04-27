/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {upperFirst} from 'lodash';
import {action, observable} from 'mobx';

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
    if (!target.hasOwnProperty(name)) {
        const fn = action.bound(target, name, {
            value: function(v) {this[property] = v}
        });
        Object.defineProperty(target, name, fn);
    }

    return descriptor && {...descriptor, configurable: true};
}


/**
 * Decorator to mark a property as @observable and also provide a simple MobX action of the
 * form `setPropName()`.
 *
 * This decorator is especially useful for creating observable properties that are intended to be
 * bound to UI components that will both display and set the property.
 *
 * Use `@bindable.ref` for a version of the function that will mark the property as observable by
 * reference. This will use the similarly named `@observable.ref` decorator in the core MobX API.
 */
export function bindable(target, property, descriptor) {
    return settable(target, property, observable(target, property, descriptor));
}
bindable.ref = function(target, property, descriptor) {
    return settable(target, property, observable.ref(target, property, descriptor));
};


