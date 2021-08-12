/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {isUndefined, sumBy} from 'lodash';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * Tracks the execution state of one or more asynchronous tasks.
 *
 * An instance of this class can be used to control masks or other UI elements that
 * track the progression of asynchronous tasks. It can be passed directly to a Panel
 * component via its `mask` property, providing a common and convenient
 * method for masking a section of a user interface while an operation is pending.
 */
export class TaskObserver {

    //-------------------
    // Main entry Points
    //-------------------
    /**
     * Create a new TaskObserver that will be pending if *any* linked
     * subtasks is still pending.
     *
     * @param {TaskObserver[]} [tasks]
     * @param {?String} [message]
     * @returns {TaskObserver}
     */
    static trackAll({tasks = [], message} = {}) {
        return new CompoundObserver('all',  tasks, message);
    }

    /**
     * Create a new TaskObserver that will be pending if its *last* linked
     * subtask is still pending.
     *
     * Useful for tracking repeated invocations of the same operation, such as
     * serially reloading of data from the server.
     *
     * @param {?String} [message]
     * @returns {TaskObserver}
     *
     */
    static trackLast({message} = {}) {
        return new CompoundObserver('last', [], message);
    }

    /**
     * @package
     *
     * Create a TaskObserver bound to a single promise.
     *
     * Not typically used directly by applications.  Instead see {@see Promise.linkTo}, which
     * provides an efficient way to link an existing TaskObserver to a promise.
     *
     * @param {Promise} promise
     * @param {?String} [message]
     *
     * @returns {TaskObserver}
     */
    static forPromise({promise, message}) {
        return new PromiseObserver(promise, message);
    }

    //---------------
    // Instance API
    //----------------
    get isTaskObserver() {
        return true;
    }

    /**
     * Is the task considered to be executing/in-progress? Observable.
     * @returns {boolean}
     */
    get isPending() {
        return false;
    }

    /**
     * The number of pending tasks. Observable.
     * @returns {number}
     */
    get pendingCount() {
        return 0;
    }

    /**
     * The message describing the executing task. Observable.
     * @returns {?string}
     */
    get message() {
        return null;
    }

    /**
     *  Set the message describing the executing task.
     *  @param {?string} msg
     */
    setMessage(msg) {}

    /**
     * Link the task to a subtask.
     *
     * @param {TaskObserver} task
     */
    linkTo(task) {}
}


//------------------------------
// Implementation
//------------------------------
class CompoundObserver extends TaskObserver {
    _mode;
    @observable.ref _subtasks;
    @observable _message

    constructor(mode, subtasks, message) {
        super();
        makeObservable(this);
        this._mode = mode;
        this._message = message;
        this._subtasks = subtasks;
    }

    @computed
    get isPending() {
        return this._subtasks.some(t => t.isPending);
    }

    @computed
    get pendingCount() {
        return sumBy(this._subtasks, 'pendingCount');
    }

    @computed
    get message() {
        const msg = this._message;
        if (!isUndefined(msg)) return msg;

        const pending = this._subtasks.filter(t => t.isPending && t.message);
        return pending.length === 1 ? pending[0].message : null;
    }

    @action
    setMessage(message) {
        this._message = message;
    }

    @action
    linkTo(task) {
        if (this.mode === 'last') {
            this._subtasks = [task];
        } else {
            const keep = this._subtasks.filter(t => t.isPending || !(t instanceof PromiseObserver));
            keep.push(task);
            this._subtasks = keep;
        }
    }
}

class PromiseObserver extends TaskObserver {

    // Keep simple as we create these in Promise.linkTo, without managing/destroying.  Could change
    // to create internally in this file in a method.
    @observable _isPending = true;
    _message;

    get isPromiseObserver()     {return true}
    get isPending()             {return this._isPending}
    get pendingCount()          {return this._isPending ? 1 : 0}
    get message()               {return this._message}

    constructor(promise, message) {
        super();
        makeObservable(this);
        this._message = message;
        promise.finally(action(() => this._isPending = false));
    }
}

