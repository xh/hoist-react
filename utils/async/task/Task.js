/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Tracks the execution state of a job.
 *
 * An instance of this class can be used as a model for masks or other UI elements that
 * track the progression of asynchronous tasks. It can be passed directly to a Panel
 * component via its `mask` property, providing a common and convenient
 * method for masking a section of a user interface while an operation is pending.
 *
 * @see concrete classes {@link Task} and {@link CompoundTask}
 */
export class Task {

    get isTask() {return true}

    /**
     * Is the task currently executing/pending?
     *
     * This observable property is the main public entry point for this object.
     * Its behavior depends on the 'type' property.
     *
     * @returns {boolean}
     */
    get isPending() {return null}

    /**
     * * @returns {?string}  description of the pending task - for end-user display.
     */
    get message() {return null}
}
