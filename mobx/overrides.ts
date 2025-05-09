/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {forEach} from 'lodash';
import {
    AnnotationsMap,
    CreateObservableOptions,
    makeObservable as baseMakeObservable,
    isObservableProp as baseIsObservableProp,
    observable,
    runInAction
} from 'mobx';

/**
 * An enhanced version of the native mobx makeObservable.
 */
export function makeObservable(
    target: any,
    annotations?: AnnotationsMap<any, never>,
    options?: CreateObservableOptions
) {
    // Finish creating 'bindable' properties for this instance.
    const bindables = target._xhBindableProperties;
    forEach(bindables, ({isRef}, name) => {
        const propName = `_${name}_bindable`,
            initVal = target[name];
        target[propName] = isRef ? observable.box(initVal, {deep: false}) : observable.box(initVal);
        Object.defineProperty(target, name, {
            get() {
                return this[propName].get();
            },
            set(v) {
                runInAction(() => this[propName].set(v));
            },
            enumerable: true,
            configurable: true
        });
    });

    return baseMakeObservable(target, annotations, options);
}

/**
 * An enhanced version of the native mobx isObservableProp
 */
export function isObservableProp(target: any, propertyKey: PropertyKey): boolean {
    return (
        baseIsObservableProp(target, propertyKey) || !!target?._xhBindableProperties?.[propertyKey]
    );
}
