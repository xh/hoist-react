/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {action, observable} from 'mobx';
import {upperFirst} from 'lodash';

/**
 * Decorator to add a simple mobx action of the form 'setPropName()' to a class.
 *
 * Applications that wish to add more complicated logic to their setter should
 * simply define the setter manually instead.
 *
 * Modelled after approach in https://github.com/farwayer/mobx-decorators.
 */
export function settable(target, property, descriptor) {
    const name = 'set' + upperFirst(property),
        fn = action.bound(target, name, {
            value: function(v) {this[property] = v}
        });

    Object.defineProperty(target, name, fn);

    return descriptor && {...descriptor, configurable: true};
}

/**
 * Decorator to mark a property as both @observable and @settable.
 *
 * Especially useful for marking properties that are intended to be bound to HoistField.
 *
 * If either specific variants of observable or a custom setter are needed, use the @observable and
 * @settable decorators directly instead.
 */
export function bindable(target, property, descriptor) {
    return settable(target, property, observable(target, property, descriptor));
}