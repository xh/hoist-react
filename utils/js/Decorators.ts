/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {debounce as lodashDebounce, isFunction} from 'lodash';
import {getOrCreate, throwIf} from './LangUtils';
import {withDebug, withInfo, logWarn} from './LogUtils';

type MethodOrGetterContext = ClassMethodDecoratorContext | ClassGetterDecoratorContext;

type AnyFn = (...args: any[]) => any;

/**
 * Decorates a class method so that it is debounced by the specified duration. Per-instance
 * (not per-class) — each instance gets its own lodash `debounce` wrapper on first call.
 * Based on https://github.com/bvaughn/debounce-decorator.
 *
 * @param duration - milliseconds to debounce.
 */
export function debounced(duration: number) {
    return function <T extends AnyFn>(baseFn: T, context: ClassMethodDecoratorContext): T {
        throwIf(
            context.kind !== 'method' || !isFunction(baseFn),
            '@debounced must be applied to a class method.'
        );
        const key = '_xh_' + String(context.name);
        return function (this: any, ...args: any[]) {
            const fn = getOrCreate(this, key, () => lodashDebounce(baseFn as any, duration));
            fn.apply(this, args);
        } as any as T;
    };
}

/**
 * Modify a method or getter so that it will compute once lazily and then cache the results.
 * Not appropriate for methods that take arguments. Typically useful on immutable objects.
 */
export function computeOnce<T extends AnyFn>(baseFn: T, context: MethodOrGetterContext): T {
    throwIf(
        (context.kind !== 'method' && context.kind !== 'getter') || !isFunction(baseFn),
        '@computeOnce must be applied to a zero-argument class method or getter.'
    );
    const key = '_xh_' + String(context.name);
    return function (this: any) {
        return getOrCreate(this, key, () => baseFn.call(this));
    } as any as T;
}

/**
 * Modify a method so that its execution is tracked and timed with a log message on the console.
 * @see withInfo
 */
export function logWithInfo<T extends AnyFn>(baseFn: T, context: ClassMethodDecoratorContext): T {
    throwIf(
        context.kind !== 'method' || !isFunction(baseFn),
        '@logWithInfo must be applied to a class method.'
    );
    const key = String(context.name);
    return function (this: any, ...args: any[]) {
        return withInfo(key, () => baseFn.apply(this, args), this);
    } as any as T;
}

/**
 * Modify a method so that its execution is tracked and timed with a debug message on the console.
 * @see withDebug
 */
export function logWithDebug<T extends AnyFn>(baseFn: T, context: ClassMethodDecoratorContext): T {
    throwIf(
        context.kind !== 'method' || !isFunction(baseFn),
        '@logWithDebug must be applied to a class method.'
    );
    const key = String(context.name);
    return function (this: any, ...args: any[]) {
        return withDebug(key, () => baseFn.apply(this, args), this);
    } as any as T;
}

/**
 * Designate a method or getter as abstract so that it throws if it is called directly.
 */
export function abstract<T extends AnyFn>(baseFn: T, context: MethodOrGetterContext): T {
    throwIf(
        (context.kind !== 'method' && context.kind !== 'getter') || !isFunction(baseFn),
        '@abstract must be applied to a class method or getter.'
    );
    const key = String(context.name);
    return function (this: any) {
        throw Exception.create(`${key} must be implemented by ${this.constructor.name}`);
    } as any as T;
}

/**
 * Decorates a class method that returns a Promise so that concurrent calls with the same arguments
 * will share a single pending Promise. Arguments must be serializable via JSON.stringify.
 */
export function sharePendingPromise<T extends AnyFn>(
    fn: T,
    context: ClassMethodDecoratorContext
): T {
    throwIf(
        context.kind !== 'method' || !isFunction(fn),
        '@sharePendingPromise must be applied to a class method.'
    );
    const key = String(context.name);
    return function (this: any, ...args: any[]) {
        try {
            const cacheKey = '_xh_' + key + JSON.stringify(args);
            return getOrCreate(this, cacheKey, () => {
                const ret = fn.apply(this, args);
                if (!(ret instanceof Promise)) {
                    logWarn(
                        `@sharePendingPromise applied to non-Promise-returning method: ${key}`,
                        this.constructor.name
                    );
                    return ret;
                }
                return ret.finally(() => delete this[cacheKey]);
            });
        } catch (e: any) {
            logWarn(
                [
                    `@sharePendingPromise unable to serialize arguments for method: ${key}.`,
                    e.message
                ],
                this.constructor.name
            );
            return fn.apply(this, args);
        }
    } as any as T;
}
