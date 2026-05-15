/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {debounce} from 'lodash';
import {getOrCreate} from './LangUtils';
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
        const key = '_xh_' + (context.name as string);
        return function () {
            const fn = getOrCreate(this, key, () => debounce(baseFn as any, duration));
            fn.apply(this, arguments);
        } as any as T;
    };
}

/**
 * Modify a method or getter so that it will compute once lazily and then cache the results.
 * Not appropriate for methods that take arguments. Typically useful on immutable objects.
 */
export function computeOnce<T extends AnyFn>(baseFn: T, context: MethodOrGetterContext): T {
    const key = '_xh_' + (context.name as string);
    return function () {
        return getOrCreate(this, key, () => baseFn.call(this));
    } as any as T;
}

/**
 * Modify a method or getter so that its execution is tracked and timed with a log message on the console.
 * @see withInfo
 */
export function logWithInfo<T extends AnyFn>(baseFn: T, context: MethodOrGetterContext): T {
    return function () {
        return withInfo(context.name as string, () => baseFn.apply(this, arguments), this);
    } as any as T;
}

/**
 * Modify a method or getter so that its execution is tracked and timed with a debug message on the console.
 * @see withDebug
 */
export function logWithDebug<T extends AnyFn>(baseFn: T, context: MethodOrGetterContext): T {
    return function () {
        return withDebug(context.name as string, () => baseFn.apply(this, arguments), this);
    } as any as T;
}

/**
 * Designate a method or getter as abstract so that it throws if it is called directly.
 */
export function abstract<T extends AnyFn>(_baseFn: T, context: MethodOrGetterContext): T {
    return function () {
        throw Exception.create(
            `${context.name as string} must be implemented by ${this.constructor.name}`
        );
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
    const name = context.name as string;
    return function () {
        try {
            const cacheKey = '_xh_' + name + JSON.stringify(arguments);
            return getOrCreate(this, cacheKey, () => {
                const ret = fn.apply(this, arguments);
                if (!(ret instanceof Promise)) {
                    logWarn(
                        `@sharePendingPromise applied to non-Promise-returning method: ${name}`,
                        this.constructor.name
                    );
                    return ret;
                }
                return ret.finally(() => delete this[cacheKey]);
            });
        } catch (e: any) {
            logWarn(
                [
                    `@sharePendingPromise unable to serialize arguments for method: ${name}.`,
                    e.message
                ],
                this.constructor.name
            );
            return fn.apply(this, arguments);
        }
    } as any as T;
}
