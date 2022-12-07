/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    action,
    autorun,
    comparer,
    computed,
    configure,
    extendObservable,
    isObservableProp,
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
export {
    action,
    autorun,
    comparer,
    computed,
    extendObservable,
    observable,
    isObservableProp,
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
export * from './makeObservable';