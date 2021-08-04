/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Tracks the execution state of some asynchronous tasks.
 *
 * An instance of this class can be used to control masks or other UI elements that
 * track the progression of asynchronous tasks. It can be passed directly to a Panel
 * component via its `mask` property, providing a common and convenient
 * method for masking a section of a user interface while an operation is pending.
 *
 * @see concrete classes {@link PromiseTaskObserver} and {@link CompoundTaskObserver}
 */
export class TaskObserver {

    get isTaskObserver() {return true}

    /**
     * Is the task currently executing/pending?
     * This observable property is the main public entry point for this object.
     *
     * @returns {boolean}
     */
    get isPending() {return null}

    /**
     * Description of the pending task - for end-user display.
     * Observable property.
     *
     * @returns {?string}
     */
    get message() {return null}
}
