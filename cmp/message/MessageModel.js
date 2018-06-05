/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from '@xh/hoist/mobx';
import {HoistModel} from '@xh/hoist/core';

/**
 * Model imperative Alerting/Confirming.
 *
 * This object may be constructed with default arguments and used to show multiple messages
 * using the alert() and confirm() methods.
 *
 * Applications should instantiate a dedicated instance of this class when they wish to assign
 * a set of default settings and/or ensure that only a single message is shown at a time from
 * a given source.
 *
 * For an easier way to create one-off messages see the global aliases XH.alert() and
 * XH.confirm().  These methods will use a global MessageSourceModel to create one-time,
 * self-disposing messages.
 */
@HoistModel()
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
     * @param {Object} [config] - default options for this instance.
     */
    constructor(config, parent) {
        this.initialConfig = config;
    }

    /**
     * Show a confirmation, with cancellation option.
     * @param {Object} [config] - options for this particular showing of the dialog.
     */
    confirm(config) {
        Object.assign(this, this.defaults, this.initialConfig, config);
        this.open();
    }

    /**
     * Show a simple alert, with no cancellation option.
     * @param {Object} [config] - options for this particular showing of the dialog.
     */
    alert(config) {
        Object.assign(this, this.defaults, this.initialConfig, config, {
            onCancel: null,
            cancelText: null,
            cancelIntent: null
        });
        this.open();
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
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }
}
