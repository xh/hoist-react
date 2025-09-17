/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {forEach, isEmpty} from 'lodash';
import {
    AnnotationsMap,
    CreateObservableOptions,
    makeObservable as baseMakeObservable,
    isObservableProp as baseIsObservableProp,
    observable,
    runInAction
} from 'mobx';
import {logError} from '@xh/hoist/utils/log/LogUtils';

/**
 * An enhanced version of the native mobx makeObservable.
 */
export function makeObservable(
    target: any,
    annotations?: AnnotationsMap<any, never>,
    options?: CreateObservableOptions
) {
    // Finish creating 'bindable' properties for this instance.
    forEach(target._xhBindableProperties, ({isRef}, name) => {
        // makeObservable is called by each constructor in the class hierarchy.
        // Don't process the property before initialized...or if its already processed
        if (!target.hasOwnProperty(name) || isBindableCreated(target, name)) {
            return;
        }

        const initVal = target[name],
            propName = `_${name}_bindable`;
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
export function isObservableProp(target: any, propertyKey: string): boolean {
    return baseIsObservableProp(target, propertyKey) || isBindableCreated(target, propertyKey);
}

/**
 * Check that if a class property was annotated with `@bindable` or `@observable` that
 * makeObservable was actually called on the instance.  Log error on fail.
 */
export function checkMakeObservable(target: any) {
    const missing = [];

    // Check @bindable props
    forEach(target._xhBindableProperties, (v, k) => {
        if (!isBindableCreated(target, k)) missing.push(k);
    });

    // Check @observable props -- use internal mobx collection containing unprocessed annotations.
    const sym = Object.getOwnPropertySymbols(target).find(
        it => it.toString() == 'Symbol(mobx-stored-annotations)'
    );
    if (sym) {
        forEach(target[sym], (v, k) => {
            if (v.annotationType_?.startsWith('observable')) missing.push(k);
        });
    }

    if (!isEmpty(missing)) {
        logError(
            `Observable properties [${missing.join(', ')}] not initialized properly. ` +
                'Ensure you call makeObservable(this) in your constructor',
            target
        );
    }
}

//--------------------
// Implementation
//--------------------
function isBindableCreated(target: any, name: string): boolean {
    return target.hasOwnProperty(`_${name}_bindable`);
}
