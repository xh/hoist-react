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
    title = null;
    icon = null;
    message = null;
    confirmText = null;
    cancelText = null;
    confirmIntent = null;
    cancelIntent = null;
    onConfirm = null;
    onCancel = null;

    // Promise to be resolved when user has clicked on choice and its internal resolver
    result = null;
    _resolver = null;

    @observable isOpen = true;

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
        this.result = new Promise(resolve => this._resolver = resolve);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    doConfirm() {
        if (this.onConfirm) this.onConfirm();
        this._resolver(true);
        this.close();
    }

    @action
    doCancel() {
        if (this.onCancel) this.onCancel();
        this._resolver(false);
        this.close();
    }

    //-----------------------
    // Implementation
    //-----------------------
    @action
    close() {
        this.isOpen = false;
    }

    destroy() {
        this.close();
    }
}
