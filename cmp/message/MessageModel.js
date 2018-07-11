/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from '@xh/hoist/mobx';
import {HoistModel} from '@xh/hoist/core';

/**
 * Model for imperative Alerting/Confirming.
 *
 * Rather than creating Messages / MessageModels directly, most applications can leverage the global
 * methods XH.message(), XH.alert(), and XH.confirm(). These convenience methods will create
 * on-the-fly MessageModel instances which will be rendered in the global AppContainer and
 * automatically destroyed upon closing.
 *
 * Expert applications may choose to manage a dedicated instance of this class directly.  This may
 * be useful when it is desired to set and re-use default settings and/or ensure that only a single
 * message is shown at a time from a given source.  In this case, the application will be
 * responsible for rendering this model in a Message component and destroying it when complete.
 */
@HoistModel()
export class MessageModel {

    /**
     * Is the message currently being displayed?
     */
    @observable isOpen = false;

    /**
     * Default Settings.
     * These will be specified in the constructor or the show() method.
     */
    defaults = {
        title: null,
        icon: null,
        message: null,
        confirmText: null,
        cancelText: null,
        confirmIntent: null,
        cancelIntent: null,
        onConfirm: null,
        onCancel: null
    }

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
        this.initialConfig = config;
        if (config.isOpen) this.show();
    }

    /**
     * Show a message.
     *
     * This methods accepts additional arguments for this showing that will override any initial
     * configuration specified in the constructor.
     *
     * @param {Object} [config] - options for this particular showing of the dialog.
     * @param {string} config.message - text to be displayed.
     * @param {string} [config.title] - title of message box.
     * @param {element} [config.icon] - icon to be displayed.
     * @param {string} [config.confirmText] - Text for confirm button. If null, button will not be shown.
     * @param {string} [config.cancelText] - Text for cancel button. If null, button will not be shown.
     * @param {string} [config.confirmIntent] - Intent for confirm button.
     * @param {string} [config.cancelIntent] - Intent for cancel button.
     * @param {function} [config.onConfirm] - Callback to execute when confirm is clicked.
     * @param {function} [config.onCancel] - Callback to execute when cancel is clicked.
     */
    @action
    show(config) {
        Object.assign(this, this.defaults, this.initialConfig, config);
        this.isOpen = true;
    }

    /**
     * Dismiss this message programmatically.
     *
     * Note that dismissing a message is typically triggered by user actions on provided buttons.
     * This method should not typically need to be called by applications.
     */
    hide() {
        this.close();
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
