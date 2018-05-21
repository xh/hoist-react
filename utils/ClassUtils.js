/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {forOwn, isPlainObject} from 'lodash';

/**
 * Provide default methods on the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *      Getters and Setters may be provided via an object appropriate for
 *      Object.defineProperty().
 *
 * If there is an existing method on C with the same name, the new method will simply be ignored.
 */
export function defaultMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        if (!proto[name]) {
            if (isPlainObject(method)) {
                Object.defineProperty(proto, name, method);
            } else {
                proto[name] = method;
            }
        }
    });
}

/**
 * Provide strict method definitions on the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *      Getters and Setters may be provided via an object appropriate for
 *      Object.defineProperty().
 *
 * If there is an existing method on C with the same name, an exception will be thrown.
 */
export function provideMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        if (proto[name]) {
            throw XH.exception(`Symbol ${name} already exists on Class.`);
        }
        if (isPlainObject(method)) {
            Object.defineProperty(proto, name, method);
        } else {
            proto[name] = method;
        }
    });
}

/**
 * Chain methods to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 * @param {Object} options
 * @param {string} [options.runOrder] - when to run this method if the method is
 *      already defined on this class ('after' | 'before').
 */
export function chainMethods(C, methods, {runOrder = 'before'} = {}) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        let existing = proto[name],
            f = null;
        if (!existing) {
            f = method;
        } else {
            f = function() {
                if (runOrder == 'after') {
                    existing.apply(this, arguments);
                    method.apply(this, arguments);
                } else {
                    method.apply(this, arguments);
                    existing.apply(this, arguments);
                }

            };
        }
        proto[name] = f;
    });
}

/**
 * Override methods to the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs representing methods to be added.
 *      The value is a generator function that receives the existing method on the
 *      class (or null) and return the new function.

 * New methods will override any existing methods on C.
 */
export function overrideMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (methodGen, name) => {
        const existing = proto[name];
        proto[name] = methodGen(existing);
    });
}