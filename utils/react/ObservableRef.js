/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {observable, action} from '@xh/hoist/mobx';

/**
 * Create an observable ref.
 *
 * The object returned by this function  has the same API as
 * the value returned by React.createRef(),  but the `current`
 * property is a MobX observable value.
 *
 * https://reactjs.org/docs/refs-and-the-dom.html
 */
export function createObservableRef() {
    const ret = action(v => ret._current.set(v));
    ret._current = observable.box(null);
    Object.defineProperty(ret, 'current', {get: () => ret._current.get()});
    return ret;
}