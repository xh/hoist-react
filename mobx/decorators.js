/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {action} from 'mobx';
import {capitalize} from 'lodash';

/**
 * Decorator to add a simple mobx action of the form 'setPropName()' to a class.
 *
 * Applications that wish to add more complicated logic to their setter should
 * simply define the setter manually instead.
 *
 * Modelled after approach in https://github.com/farwayer/mobx-decorators.
 */
export function settable(target, property, descriptor) {
    const name = 'set' + capitalize(property),
        fn = action.bound(target, name, {
            value: function(v) {this[property] = v}
        });

    Object.defineProperty(target, name, fn);

    return descriptor && {...descriptor, configurable: true};
}
