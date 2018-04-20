/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from 'hoist/mobx';

/**
 * Model for convenient, imperative Alerting/Confirming.
 *
 * This object may be constructed with default arguments and used to show multiple messages
 * using the alert() and confirm() methods.
 */
export class MessageModel {

    @observable isOpen = false;

    /**
     * Default Settings.
     * These can be overridden in the constructor, the alert(), or the confirm() methods.
     */
    defaults = {
        title: null,
        icon: null,
        message: null,
        confirmText: 'OK',
        cancelText: 'Cancel',
        confirmIntent: null,
        cancelIntent: null,
        onConfirm: null,
        onCancel: null
    }

    /**
     * @param {Object} config - default options for this instance.
     */
    constructor(config) {
        this.initialConfig = config;
    }

    /**
     * Show a confirmation, with cancellation option.
     * @param {Object} config - options for this particular show of the dialog.
     */
    @action
    confirm(config) {
        Object.assign(this, this.defaults, this.initialConfig, config);
        this.isOpen = true;
    }

    /**
     * Show a simple alert, with no cancellation option.
     * @param {Object} config - options for this particular show of the dialog.
     */
    @action
    alert(config) {
        Object.assign(this, this.defaults, this.initialConfig, config, {
            onCancel: null,
            cancelText: null,
            cancelIntent: null
        });
        this.isOpen = true;
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
}
