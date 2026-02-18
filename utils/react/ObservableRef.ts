/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, observable} from '@xh/hoist/mobx';
import {RefCallback, RefObject} from 'react';

/**
 * Create an observable ref.
 *
 * The object returned by this function supports the
 * API returned by React.createRef(), but the `current`
 * property is a MobX observable value.
 *
 * This object *also* supports the legacy callback Ref API
 *
 * https://reactjs.org/docs/refs-and-the-dom.html
 */
export function createObservableRef<T>(): RefObject<T> & RefCallback<T> {
    const ret = action(v => ret._current.set(v)) as any;
    ret._current = observable.box(null, {deep: false});
    Object.defineProperty(ret, 'current', {get: () => ret._current.get()});
    return ret;
}
