/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from '@xh/hoist/mobx';
import {HoistModel} from '@xh/hoist/core';

/**
 * Model for a single instance of a modal dialog.
 *
 * @private
 */
@HoistModel()
export class MessageModel {

    // Immutable properties
    title: null;
    icon: null;
    message: null;
    confirmText: null;
    cancelText: null;
    confirmIntent: null;
    cancelIntent: null;
    onConfirm: null;
    onCancel: null;

    /**
     * Is the message currently being displayed?
     */
    @observable isOpen = true;

    /**
     * @param {Object} [config] - default options for this instance.
     * @param {string} config.message - icon to be displayed.
     * @param {string} [config.title] - title of message box.
     * @param {element} [config.icon] - icon to be displayed.
     * @param {string} [config.confirmText] - Text for confirm button. If null, no button will be shown.
     * @param {string} [config.cancelText] - Text for cancel button. If null, no button will be shown.
     * @param {string} [config.confirmIntent] - Intent for confirm button.
     * @param {string} [config.cancelIntent] - Intent for cancel button.
     * @param {function} [config.onConfirm] - Callback to execute when confirm is clicked.
     * @param {function} [config.onCancel] - Callback to execute when cancel is clicked.
     */
    constructor(config) {
        this.message = config.message;
        this.title = config.title;
        this.icon = config.icon;
        this.confirmText = config.confirmText;
        this.cancelText = config.cancelText;
        this.confirmIntent = config.confirmIntent;
        this.cancelIntent = config.cancelIntent;
        this.onConfirm = config.onConfirm;
        this.onCancel = config.onCancel;
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    doConfirm() {
        if (this.onConfirm) this.onConfirm();
        this.close();
    }

    @action
    doCancel() {
        if (this.onCancel) this.onCancel();
        this.close();
    }

    @action
    close() {
        this.isOpen = false;
    }

    destroy() {
        this.close();
    }
}
