/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Create a mixin that can be used to decorate and enhance a class with
 * methods.
 *
 * @param {Object} config - key-value pairs of new methods to be added.
 *
 * If any of the methods already exist on C, the new method will be called
 * after the existing method.
 */
export function mixin(config) {
    return (C) => {
        addMethods(C, config);
    };
}

/**
 * Add methods to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *
 * If any method already exists on C, the new method will be called *after*
 * the existing method.
 */
export function addMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        let base = proto[name],
            f = null;
        if (!base) {
            f = method;
        } else {
            f = function () {
                base.apply(this, arguments);
                method.apply(this, arguments);
            };
        }
        proto[name] = f;
    });
}

/**
 * Override methods to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *
 * New methods will override any existing methods on C.
 */
export function overrideMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        proto[name] = method;
    });
}

/**
 * Provide default methods on the  prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *
 * No changes will be made to any existing methods on C.
 */
export function defaultMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        if (!proto[name]) {
            proto[name] = method;
        }
    });
}


/**
 * Add a property to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {string} props - name-value pairs of propeties to be added, where
 *      value is an object appropriate for Object.defineProperty.
 *
 * New properties will override any existing properties on this class.
 */
export function addProperties(C, props) {
    const proto = C.prototype;
    forOwn(props, (cfg, name) => {
        Object.defineProperty(proto, name, cfg);
    });
}