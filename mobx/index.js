/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {
    action,
    autorun,
    comparer,
    computed,
    configure,
    extendObservable,
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
    makeObservable,
    observable,
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
