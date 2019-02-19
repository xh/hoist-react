/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';

/**
 * DialogModel supports configuration for modal dialog.
 */
@HoistModel
export class DialogModel {

    //-----------------------
    // Immutable Properties
    //-----------------------
    isAnimated;
    isCloseButtonShown;
    canEscapeKeyClose;
    onClose;


    //---------------------
    // Observable State
    //---------------------
    /** Is the Dialog open? */
    @observable isOpen;


    /**
     * @param {Object} config
     * @param {boolean} [config.isAnimated] - True to use css transition animations when showing/hiding dialog.
     * @param {boolean} [config.isOpen] - Is model open or closed?
     */
    constructor({
        isAnimated = false,
        isCloseButtonShown = true,
        canEscapeKeyClose = true,
        onClose = this.close,
        isOpen = false
    } = {}) {
        // Set immutables
        this.isAnimated = isAnimated;
        this.isCloseButtonShown = isCloseButtonShown;
        this.canEscapeKeyClose = canEscapeKeyClose;
        this.onClose = onClose;

        // Set observable state
        this.isOpen = isOpen;
    }

    //----------------------
    // Actions
    //----------------------
    @action
    close(evt) {
        this.isOpen = false;
    }

    @action
    open() {
        this.isOpen = true;
    }
}