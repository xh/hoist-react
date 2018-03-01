/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action} from 'hoist/mobx';

/**
 * Model for convenient, imperative Alert/Confirming.
 */
export class AlertModel {

    @observable isOpen = false;

    title = '';
    message = null;
    onConfirm = null;
    onCancel = null;
    confirmText = '';
    cancelText = '';

    /**
     * Show a Confirmation, with rejection option.
     *
     * @param message, text to be shown.
     * @param title, optional
     * @param onConfirm, optional function to execute on Confirmation
     * @param onCancel, optional function to execution on 
     * @param confirmText, text for confirm button
     * @param cancelText, text for reject button
     */
    @action
    confirm({
        message,
        title = null,
        onConfirm = null,
        onCancel = null,
        confirmText = 'OK',
        cancelText = 'Cancel'
    }) {
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel= onCancel;
        this.confirmText = confirmText;
        this.cancelText = cancelText;
        this.isOpen = true;
    }

    /**
     * Show a simple alert.
     *
     * @param message, text to be shown.
     * @param title, optional
     * @param onConfirm, optional function to execute onConfirmation
     * @param confirmText, text for confirm button
     */
    @action
    alert({
        message,
        title = null,
        onConfirm = null,
        confirmText = 'OK',
    }) {
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.confirmText = confirmText;

        this.cancelText = null;
        this.onCancel = null;
        
        this.isOpen = true;
    }

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
}