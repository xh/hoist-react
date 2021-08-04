/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {observable, computed, makeObservable} from '@xh/hoist/mobx';
import {Task} from './Task';

/**
 * Tracks the combined execution state of a collection of subtasks.
 */
export class CompoundTask extends Task {

    get isCompoundTask() {
        return true;
    }

    @observable.ref tasks = null;

    /**
     * @param {Object} [c] - configuration
     * @param {Task[]} [c.tasks] - subtasks
     */
    constructor({tasks = []} = {}) {
        super();
        makeObservable(this);
        this.tasks = tasks;
    }

    /**
     * Add a subtask.
     *
     * @param {Task} subTask
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