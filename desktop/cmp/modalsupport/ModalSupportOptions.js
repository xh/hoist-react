/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

/**
 * Convenience configuration for a PanelModel.modalSupport
 */
export class ModalSupportOptions {
    /** @member {?String|number} */
    width;
    /** @member {?String|number} */
    height;
    /** @member {boolean} */
    startModal;
    /** @member boolean */
    canOutsideClickClose;
    /**
     *
     * @param {Object} opts
     * @param {String|number} [width] - css width
     * @param {String|number} [height] - css height
     * @param {boolean} [startModal] - begin in modal mode?
     * @param {boolean} [canOutsideClickClose]
     */
    constructor({
        width = '90vw',
        height = '90vh',
        startModal = false,
        canOutsideClickClose = true
    } = {}) {
        this.width = width;
        this.height = height;
        this.startModal = startModal;
        this.canOutsideClickClose = canOutsideClickClose;
    }
}