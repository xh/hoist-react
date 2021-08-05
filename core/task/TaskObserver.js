/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {isEmpty, isFunction} from 'lodash';

/**
 * Tracks the execution state of one or more asynchronous tasks.
 *
 * An instance of this class can be used to control masks or other UI elements that
 * track the progression of asynchronous tasks. It can be passed directly to a Panel
 * component via its `mask` property, providing a common and convenient
 * method for masking a section of a user interface while an operation is pending.
 *
 * Instances can be constructed for standalone use or to link to other TaskObserver instances,
 * in which case they will report on either the overall status of all linked tasks or the status
 * of the most recently linked task, as determined by the `mode` config.
 */
export class TaskObserver extends HoistBase {

    /**
     * @param {Promise} promise
     * @param {string} [message]
     * @return {TaskObserver}
     */
    static forPromise(promise, message) {
        const ret = new TaskObserver({message, isPending: true, completesOnce: true});
        promise.finally(() => ret.setIsPending(false));
        return ret;
    }

    static forLoadTracking() {
        return new TaskObserver({message: 'Loading...', mode: 'last'});
    }

    @observable _isPending;
    @observable _message;
    _mode;
    _completesOnce;

    /** @type {TaskObserver[]} */
    @observable.ref _subtasks = [];

    get isTaskObserver() {return true}

    /**
     * @param {boolean} [isPending]
     * @param {string} [message]
     * @param {string} [mode]
     * @param {boolean} [completesOnce]
     * @param {(TaskObserver[])} [subtasks]
     */
    constructor({
        isPending = false,
        message,
        mode = 'all',
        completesOnce = false,
        subtasks= []
    } = {}) {
        super();
        makeObservable(this);
        this._isPending = isPending;
        this._message = message;
        this._mode = mode;
        this._completesOnce = completesOnce;
        subtasks.forEach(it => this.link(it));
    }

    /** @returns {boolean} */
    @computed
    get isPending() {
        return this._isPending || this._subtasks.some(it => it.isPending);
    }

    /** @returns {?string} */
    @computed
    get message() {
        const {isPending} = this;
        if (!isPending) return null;

        const pendingSubTasks = this._subtasks.filter(it => it.isPending);
        if (!isEmpty(pendingSubTasks)) return pendingSubTasks[0].message;
        return this._message;
    }

    /** @returns {boolean} */
    get isPermanentlyComplete() {
        return !this.isPending && this._completesOnce;
    }

    @action
    setIsPending(isPending) {
        this._isPending = isPending;
    }

    @action
    setMessage(message) {
        this._message = message;
    }

    /** @param {(TaskObserver|Promise)} task */
    @action
    linkTo(task) {
        if (isFunction(task.then)) {
            task = TaskObserver.forPromise(task);
        }

        const trackingLastOnly = this._mode === 'last',
            newSubtasks = trackingLastOnly ? [task] : [...this._subtasks, task];

        // Cull any completely done subtasks while updating.
        this._subtasks = newSubtasks.filter(it => !it.isPermanentlyComplete);
    }

}
