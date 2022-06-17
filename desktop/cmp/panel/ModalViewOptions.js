/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

/**
 * Convenience configuration for a PanelModel.modalView
 */
export class ModalViewOptions {
    /** @member {?String|number} */
    width;
    /** @member {?String|number} */
    height;
    /** @member boolean */
    canOutsideClickClose;
    /**
     *
     * @param {Object} opts
     * @param {String|number} [width] - css width
     * @param {String|number} [height] - css height
     * @param {boolean} [canOutsideClickClose]
     */
    constructor({width = null, height = null, canOutsideClickClose = true} = {}) {
        this.width = width;
        this.height = height;
        this.canOutsideClickClose = canOutsideClickClose;
    }
}