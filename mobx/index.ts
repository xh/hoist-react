/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    action,
    AnnotationsMap,
    autorun,
    comparer,
    computed,
    configure,
    CreateObservableOptions,
    extendObservable,
    isObservableProp,
    makeObservable as mobxMakeObservable,
    observable,
    override,
    reaction,
    runInAction,
    toJS,
    trace,
    untracked,
    when
} from 'mobx';
import {observer} from 'mobx-react-lite';
import {bindable, settable} from './decorators';

configure({enforceActions: 'observed'});

//---------------------
// Re-exports
//---------------------
export {
    action,
    autorun,
    bindable,
    comparer,
    computed,
    extendObservable,
    observable,
    isObservableProp,
    observer,
    override,
    reaction,
    runInAction,
    settable,
    toJS,
    trace,
    untracked,
    when
};


export function makeObservable(target: any, annotations?: AnnotationsMap<any, never>, options?: CreateObservableOptions) {

    // Finish creating 'bindable' properties.
    const bindables = target._xhBindableProperties ?? [];
    bindables.forEach(name => {
        const propName = `_${name}_bindable`;
        Object.defineProperty(target, name, {
            get() {return this[propName].get()},
            set(v) {runInAction(() => this[propName].set(v))},
            enumerable: true,
            configurable: true
        });
    });

    return mobxMakeObservable(target, annotations, options);
}