/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {configure} from 'mobx';

// As per https://github.com/mobxjs/mobx-react-lite/#observer-batching
import 'mobx-react-lite/batchingForReactDom';

export {
    action,
    autorun,
    computed,
    observable,
    reaction,
    runInAction,
    toJS,
    trace,
    untracked,
    when,
    comparer
} from 'mobx';
export {observer} from 'mobx-react';
export {settable, bindable} from './decorators';

configure({enforceActions: 'observed'});
