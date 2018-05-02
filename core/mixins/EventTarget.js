/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {pull} from 'lodash';
import {wait} from 'hoist/promise';
import {mixin} from './ClassUtils';

/**
 * Mixin to make a class an event target.
 *
 * Provides support for adding and removing listeners, and firing
 * events on itself.
 */
export const EventTarget = mixin({

    /**
     * Add a listener
     *
     * @param {string} eventName
     * @param {function} fn
     * @return {{eventName: *, fn: *}} - object representing the handler which was added.
     */
    addListener(eventName, fn) {
        this._listeners = this._listeners || [];
        let listeners = this._listeners[eventName];
        if (listeners == null) {
            listeners = this._listeners[eventName] = [];
        }
        const ret = {eventName, fn};
        listeners.push(ret);
        return ret;
    },

    /**
     * Remove a listener.
     *
     * @param {Object} listener - listener object returned by addListener
     */

    removeListener(listener) {
        const listeners = this._listeners[listener.eventName];
        if (listeners) {
            pull(listeners, listener);
        }
    },

    /**
     * Fire an event
     *
     * @param {string} eventName - event to be fired.
     * @param {Object} ev - object representing data to be passed to the event handlers.
     */

    fireEvent(eventName, ev = {}) {
        const listeners = this._listeners[eventName];
        if (!listeners) return;

        wait(1)
            .then(() => listeners.forEach(it => it.fn(ev, this)))
            .catchDefault({showAlert: false});
    }
});
