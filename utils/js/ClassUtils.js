/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Exception} from '@xh/hoist/exception';
import {forOwn, isPlainObject} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';


/**
 * Mixin (decorate) a JS Class with methods and other decorators.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} config
 * @param {String} [config.name] - name for mixin - will mark the class with `is[Name]: true` flag.
 * @param {Object} [config.includes] - list of additional decorators to apply to the class.
 *      Will be applied in reverse order, to mimic their application in a file context (i.e. first
 *      decorator listed is applied last).
 * @param {Object} [config.defines] - map of method names > impls to install on class prototype.
 *      Will *replace* any existing methods for the same key.
 * @param {Object} [config.defaults]- map of method names > impls to install on class prototype.
 *      Will *ignore* method if there are any existing methods for the same key.
 * @param {Object} [config.provides] - map of method names > impls to install on class prototype.
 *      Will *throw* if there are any existing methods for the same key.
 * @param {Object} [config.chains] - map of method names > impls to install on class prototype.
 *      Will *chain* to any existing method for the same key, creating a new chained method.
 *      The new method will be run after any existing method for this key.
 * @param {Object} [config.overrides] - map of name-value pairs representing methods to be added.
 *      The value is a generator function that receives the existing method on the class (or null)
 *      and returns the new function.
 *
 * @returns {function} - decorator for a JS class.
 */
export function applyMixin(C, config) {
    const {name, includes, defines, defaults, provides, overrides, chains, ...rest} = config;
    forOwn(rest, (v, k) => {
        throw Exception.create(`Unknown key '${k}' provided to applyMixin.`);
    });

    if (name) {
        markClass(C, 'is' + name);

        // For backward compatibility.  Remove/deprecate?
        if (name.endsWith('Support')) markClass(C, 'has' + name);
    }

    if (defines) defineMethods(C, defines);
    if (defaults) defaultMethods(C, defaults);
    if (provides) provideMethods(C, provides);
    if (overrides) overrideMethods(C, overrides);
    if (chains) chainMethods(C, chains);

    if (includes) {
        includes.reverse().forEach(decorator => C = decorator(C));
    }
    return C;
}

//--------------------------------------
// Implementation
//--------------------------------------

/**
 * Mark a class and its instances with a boolean property set to true.
 *
 * Useful for providing an identifying flag for marking objects.
 * 
 * @param {String} flag
 */
function markClass(C, flag) {

    throwIfNameCollision(C, flag,  C);
    throwIfNameCollision(C.prototype, flag,  C);

    const def = {value: true, writable: false};
    Object.defineProperty(C, flag, def);
    Object.defineProperty(C.prototype, flag, def);
}


/**
 * Define methods on the prototype of a class.
 *
 * @param {Object} C - class to be enhanced.
 * @param {Object} methods - name-value pairs of methods to be added.
 *      Getters and Setters may be provided via an object appropriate for
 *      Object.defineProperty().
 *
 * This method will replace any existing method definitions for the same name.  To provide an
 * implementation that refers to the pre-existing implementation, see overrideMethods().
 */
function defineMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        installMethod(proto, name, method);
    });
}

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
function defaultMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        if (!proto[name]) installMethod(proto, name, method);
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
function provideMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (method, name) => {
        throwIfNameCollision(proto, name,  C);
        installMethod(proto, name, method);
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
function chainMethods(C, methods, {runOrder = 'after'} = {}) {
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
function overrideMethods(C, methods) {
    const proto = C.prototype;
    forOwn(methods, (methodGen, name) => {
        const existing = proto[name];
        proto[name] = methodGen(existing);
    });
}

function installMethod(proto, name, method) {
    if (isPlainObject(method)) {
        Object.defineProperty(proto, name, method);
    } else {
        proto[name] = method;
    }
}

function throwIfNameCollision(obj, name, C) {
    throwIf(obj[name], `Symbol '${name}' already exists on Class : '${C.name}'`);
}
