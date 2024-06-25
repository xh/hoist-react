/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {sumBy, head} from 'lodash';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {ReactNode} from 'react';
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
     */
    static trackAll({
        tasks = [],
        message
    }: {tasks?: TaskObserver[]; message?: string} = {}): TaskObserver {
        return new CompoundObserver('all', tasks, message);
    }

    /**
     * Create a new TaskObserver that will be pending if its *last* linked
     * subtask is still pending.
     *
     * Useful for tracking repeated invocations of the same operation, such as
     * serially reloading of data from the server.
     */
    static trackLast({message}: {message?: string} = {}): TaskObserver {
        return new CompoundObserver('last', [], message);
    }

    /**
     * Create a TaskObserver bound to a single Promise.
     * @see {@link Promise.linkTo} - preferred way to link an existing TaskObserver to a promise.
     * @internal
     */
    static forPromise({promise, message}) {
        return new PromiseObserver(promise, message);
    }

    //---------------
    // Instance API
    //----------------
    get isTaskObserver(): boolean {
        return true;
    }

    /**
     * Is the task considered to be executing/in-progress? Observable.
     */
    get isPending(): boolean {
        return false;
    }

    /**
     * The number of pending tasks. Observable.
     */
    get pendingCount(): number {
        return 0;
    }

    /**
     * The message describing the executing task. Observable.
     */
    get message(): ReactNode {
        return null;
    }

    /**
     *  Set the message describing the executing task.
     */
    setMessage(msg: ReactNode) {}

    /**
     * Link the task to a subtask.
     */
    linkTo(task: TaskObserver) {}

    /**
     * Clear any tasks currently being observed.
     */
    clear() {}

    /**
     * This class is abstract and should not be instantiated directly. To get an instance of this
     * class, use static methods trackFirst(), trackLast() or fromPromise().
     * @internal
     */
    constructor() {
        throwIf(
            this.constructor === TaskObserver,
            'TaskObserver is abstract and should not be instantiated directly. To get an ' +
                'instance of this class, use static methods trackFirst(), trackLast() or forPromise().'
        );
    }
}

//------------------------------
// Implementation
//------------------------------
class CompoundObserver extends TaskObserver {
    private _mode: 'last' | 'all';

    @observable.ref
    private _subtasks: TaskObserver[];

    @observable.ref
    private _message: ReactNode;

    constructor(mode, subtasks, message) {
        super();
        makeObservable(this);
        this._mode = mode;
        this._message = message;
        this._subtasks = subtasks;
    }

    @computed
    override get isPending() {
        return this._subtasks.some(t => t.isPending);
    }

    @computed
    override get pendingCount() {
        return sumBy(this._subtasks, 'pendingCount');
    }

    @computed
    override get message() {
        const pending = this._subtasks.filter(t => t.isPending && t.message);
        return head(pending)?.message ?? this._message ?? null;
    }

    @action
    override setMessage(message) {
        this._message = message;
    }

    @action
    override linkTo(task) {
        if (this._mode === 'last') {
            this._subtasks = [task];
        } else {
            const keep = this._subtasks.filter(t => t.isPending || !(t instanceof PromiseObserver));
            keep.push(task);
            this._subtasks = keep;
        }
    }

    @action
    override clear() {
        this._subtasks = [];
    }
}

class PromiseObserver extends TaskObserver {
    // Keep simple as we create these in Promise.linkTo, without managing/destroying.  Could change
    // to create internally in this file in a method.
    @observable
    private _isPending: boolean = true;
    private _message: ReactNode;

    get isPromiseObserver() {
        return true;
    }
    override get isPending() {
        return this._isPending;
    }
    override get pendingCount() {
        return this._isPending ? 1 : 0;
    }
    override get message() {
        return this._message;
    }

    @action
    override clear() {
        this._isPending = false;
    }

    constructor(promise, message) {
        super();
        makeObservable(this);
        this._message = message;
        promise.finally(action(() => (this._isPending = false)));
    }
}
