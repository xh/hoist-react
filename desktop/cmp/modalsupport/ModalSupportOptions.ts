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

    width: string|number;
    height: string|number;
    canOutsideClickClose: boolean;

    /**
     * @param width - css width
     * @param height - css height
     * @param canOutsideClickClose
     */
    constructor(opts: {width?: string|number, height?: string|number, canOutsideClickClose?: boolean} = {}) {
        const {width = '90vw', height = '90vh', canOutsideClickClose = true} = opts;
        this.width = width;
        this.height = height;
        this.canOutsideClickClose = canOutsideClickClose;
    }
}