/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Add a property to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {string} name - name of property.
 * @param {Object} cfg - object appropriate for Object.defineProperty.
 *
 * If name is already a property on this class, this function is a no-op.
 */
export function addProperty(C, name,  cfg) {
    const proto = C.prototype;
    if (!proto[name]) {
        Object.defineProperty(proto, name, cfg);
    }
}

/**
 * Add methods to the prototype of a class.
 *
 * @param {Object} C - class to be enhance.
 * @param {Object} mixins - key-value pairs of new methods to be added.
 *
 * If any of the methods already exist on C, the new method will be called
 * after the existing method.
 */
export function mixinMethods(C, mixins) {
    const proto = C.prototype;

    for (const name in mixins) {
        const base = proto[name],
            mixin = mixins[name];
        let f = null;
        if (!base) {
            f = mixin;
        } else {
            f = function() {
                base.apply(this, arguments);
                mixin.apply(this, arguments);
            };
        }
        proto[name] = f;
    }
}


