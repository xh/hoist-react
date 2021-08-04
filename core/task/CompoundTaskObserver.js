/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {observable, computed, makeObservable} from '@xh/hoist/mobx';
import {TaskObserver} from './TaskObserver';

/**
 * Tracks the combined execution state of a collection of subtasks.
 */
export class CompoundTaskObserver extends TaskObserver {

    @observable.ref tasks;

    /**
     * @param {Object} [c] - configuration
     * @param {TaskObserver[]} [c.tasks] - subtasks
     */
    constructor({tasks = []} = {}) {
        super();
        makeObservable(this);
        this.tasks = tasks;
    }

    /**
     * Add a subtask.
     *
     * @param {TaskObserver} subTask
     */
    add(subTask) {
        this.tasks = [...this.tasks, subTask];
    }

    //----------------
    // Implementation
    //----------------
    @computed
    get isPending() {
        return this.tasks.some(t => t.isPending);
    }

    @computed
    get message() {
        const pending = this.tasks.filter(t => t.isPending && t.message);
        return pending.length === 1 ? pending.message : null;
    }
}