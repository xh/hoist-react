/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {pull} from 'lodash';
import {wait} from 'hoist/promise';

export class EventSource {

    _listeners = {};

    addListener(eventName, fn) {
        let listeners = this._listeners[eventName];
        if (listeners == null) {
            listeners = this._listeners[eventName] = [];
        }
        const ret = {eventName, fn};
        listeners.push(ret);
        return ret;
    }

    removeListener(l) {
        const listeners = this._listeners[l.eventName];
        if (listeners) {
            pull(listeners, l);
        }
    }

    fireEvent(eventName, ev = {}) {
        const listeners = this._listeners[eventName];
        if (!listeners) return;

        wait(1)
            .then(() => listeners.forEach(it => it.fn(ev, this)))
            .catchDefault({showAlert: false});
    }
}
