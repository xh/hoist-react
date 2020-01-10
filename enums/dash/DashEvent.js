/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Names for events sent to DashViewModels using GoldenLayouts EventEmitter.
 *
 * @enum {DashEvent}
 * @see {DashContainerModel.emitEvent}
 */
export const DashEvent = Object.freeze({

    /** Whether or not DashView's tab is active in its stack. */
    IS_ACTIVE: 'isActive'

});

/**
 * @typedef {string} DashEvent
 */
