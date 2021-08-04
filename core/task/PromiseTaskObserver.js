/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {TaskObserver} from './TaskObserver';

/**
 * Tracks the resolution state of a stream of promise invocations.
 *
 * An instance of this class can easily be bound to promise chains and then used as a model for
 * masks or other UI elements that track the progression of asynchronous tasks. It can be passed
 * directly to a Panel component via its `mask` property, providing a common and convenient
 * method for masking a section of a user interface while an operation is pending.
 *
 * @see Promise#linkTo
 */
export class PromiseTaskObserver extends TaskObserver {

    mode = null;

    @observable _message = null;
    @observable _pendingCount = 0;
    @observable.ref _lastCall = null;

    /**
     * @param {Object} [c] - configuration.
     * @param {string} [c.mode] - behavior with respect to multiple linked promises.
     *      'all' to track all linked promises, 'last' to track the last linked promise only.
     * @param {?string} [c.message] - description of the pending task - for end-user display.
     */
    constructor({mode = 'last', message = null} = {}) {
        super();
        makeObservable(this);
        this.mode = mode;
        this._message = message;
    }

    /**
     * Link this object to a promise.
     * Not typically called directly by applications - call Promise.linkTo() instead.
     *
     * @param {Promise} promise
     * @param {?string} [message]
     */
    @action
    link(promise, message) {
        this._pendingCount++;
        this._lastCall = promise;
        promise.finally(() => this.onComplete(promise));
        if (!isUndefined(message)) this.message = message;
    }

    get isPending() {
        return this.mode === 'all' ? this.anyPending : this.lastPending;
    }

    get message() {
        return this._message;
    }

    @action
    setMessage(msg) {
        this._message = msg;
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    get anyPending() {
        return this._pendingCount > 0;
    }

    get lastPending() {
        return this._lastCall != null;
    }

    @action
    onComplete(promise) {
        if (this._pendingCount)          this._pendingCount--;
        if (promise === this._lastCall)  this._lastCall = null;
    }
}

