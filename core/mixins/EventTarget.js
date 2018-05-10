/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {pull} from 'lodash';
import {wait} from 'hoist/promise';
import {provideMethods, chainMethods} from 'hoist/utils/ClassUtils';

/**
 * Mixin to make a class an event target.
 * Provides support for adding and removing listeners and firing events on itself.
 */
export function EventTarget(C) {
    C.isEventTarget = true;

    provideMethods(C, {

        /**
         * Map of current listeners on this target, by listener name.
         * @param {string} eventName - name of event.
         * @return Array
         */
        getListeners(eventName) {
            const all = this._listeners = (this._listeners || {});
            let ret = all[eventName];
            if (!ret) {
                ret = all[eventName] = [];
            }
            return ret;
        },

        /**
         * Add a listener.
         * @param {string} eventName
         * @param {function} fn
         * @return {{eventName: string, fn: function}} - object representing the listener which was added.
         */
        addListener(eventName, fn) {
            const listeners = this.getListeners(eventName),
                ret = {eventName, fn};

            listeners.push(ret);
            return ret;
        },

        /**
         * Remove a listener.
         * @param {Object} listener - listener object returned by addListener().
         */
        removeListener(listener) {
            const listeners = this.getListeners(listener.eventName);
            if (listeners) {
                pull(listeners, listener);
            }
        },

        /**
         * Fire an event.
         * @param {string} eventName - event to be fired.
         * @param {Object} ev - object representing data to be passed to the event handlers.
         */
        fireEvent(eventName, ev = {}) {
            const listeners = this.getListeners(eventName);
            if (!listeners) return;

            wait(1)
                .then(() => listeners.forEach(it => it.fn(ev, this)))
                .catchDefault({showAlert: false});
        }
    });

    chainMethods(C, {
        /**
         * Destroy this object, cleaning up all listeners.
         */
        destroy() {
            this._listeners = null;
        }
    });

    return C;
}
