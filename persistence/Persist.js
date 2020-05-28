/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


/**
 * Decorator to make a property persistent.
 */
export function persist(target, property, descriptor) {
    const originalSetter = descriptor.set,
        originalGetter = descriptor.get;
    console.log(descriptor);

    descriptor.set = function(value) {
        console.log('set' + value);
        originalSetter?.call(this, value);
    };
    descriptor.get = function() {
        const val = originalGetter.call(this);
        console.log(val);
        return val;
    };
    return descriptor;
}
