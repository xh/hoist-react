/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    action,
    actionBound,
    autorun,
    compareDefault,
    compareIdentity,
    compareShallow,
    compareStructural,
    computed,
    computedStruct,
    configure,
    extendObservable,
    isComputedProp,
    isObservableProp,
    observable,
    observableDeep,
    observableRef,
    observableShallow,
    observableStruct,
    reaction,
    runInAction,
    toJS,
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
    actionBound,
    autorun,
    compareDefault,
    compareIdentity,
    compareShallow,
    compareStructural,
    computed,
    computedStruct,
    extendObservable,
    isComputedProp,
    isObservableProp,
    observable,
    observableDeep,
    observableRef,
    observableShallow,
    observableStruct,
    observer,
    reaction,
    runInAction,
    toJS,
    untracked,
    when
};
export type {IAutorunOptions, IEqualsComparer, IReactionDisposer, IReactionOptions} from 'mobx';

export * from './decorators';
