/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    action,
    autorun,
    comparer,
    computed,
    configure,
    extendObservable,
    isObservableProp,
    makeObservable,
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

configure({enforceActions: 'observed'});

//---------------------
// Re-exports
//---------------------
// `makeObservable` / `isObservableProp` are re-exported straight from MobX as a pass-through for
// external code that still imports them. Hoist apps on v85+ no longer need to call them — TC39
// accessor decorators register observables at class-definition time.
export {
    action,
    autorun,
    comparer,
    computed,
    extendObservable,
    isObservableProp,
    makeObservable,
    observable,
    observer,
    override,
    reaction,
    runInAction,
    toJS,
    trace,
    untracked,
    when
};

export * from './decorators';
