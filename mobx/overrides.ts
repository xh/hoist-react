/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {forEach} from 'lodash';
import {
    AnnotationsMap,
    CreateObservableOptions,
    makeObservable as baseMakeObservable,
    isObservableProp as baseIsObservableProp
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
    // Do here to ensure it's enumerable on *instance*
    const bindables = target._xhBindableProperties;
    forEach(bindables, (descriptor, name) => {
        Object.defineProperty(target, name, descriptor);
    });

    return baseMakeObservable(target, annotations, options);
}

/**
 * An enhanced version of the native mobx isObservableProp
 */
export function isObservableProp(target: any, propertyKey: PropertyKey) {
    return (
        baseIsObservableProp(target, propertyKey) || target?._xhBindableProperties?.[propertyKey]
    );
}
