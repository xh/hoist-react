/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {action, observable} from '@xh/hoist/mobx';
import {RefObject} from 'react';

/**
 * Create an observable ref.
 *
 * The object returned by this function has the same API as
 * the value returned by React.createRef(), but the `current`
 * property is a MobX observable value.
 *
 * https://reactjs.org/docs/refs-and-the-dom.html
 */
export function createObservableRef<T=any>(): RefObject<T> {
    const ret = action(v => ret._current.set(v));
    ret._current = observable.box(null, {deep: false});
    Object.defineProperty(ret, 'current', {get: () => ret._current.get()});
    return ret;
}