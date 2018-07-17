/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from '@xh/hoist/mobx';
import {HoistModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {SECONDS} from '@xh/hoist/utils/DateTimeUtils';
import {Position} from '@xh/hoist/kit/blueprint';

/**
 * Model for imperative Toasts.
 *
 * Rather than creating Toasts directly, most applications can leverage the global XH.toast() method.
 * This convenience method will create on-the-fly ToastModel instances which will be queued and rendered
 * in the global AppContainer and automatically destroyed upon closing.
 */
@HoistModel()
export class ToastModel {

    // Immutable public properties
    manager = null;
    icon = null;
    message = null;
    timeout = null;
    intent = null;
    position = null;

    /**
     * Is the message currently being displayed?
     * Typically set by ToastManager.
     */
    @observable isShown = false;

    /**
     * Has the toast been dismissed, either by timing out or being dismissed by the user?
     * Typically set by ToastManager.
     */
    @observable isDismissed = false;

    /**
     * @param {string} message - the message to show in the toast.
     * @param {element} [icon] - icon to be displayed
     * @param {number} [timeout] - time in milliseconds to display the toast.
     * @param {string} [intent] - the Blueprint intent.
     * @param {Position} [position] - position in viewport to display. Desktop only. See Blueprint Position enum.
     * @param {ToastManagerModel} [manager] - a reference to the ToastManagerModel.
     */
    constructor({
        message,
        icon = Icon.check(),
        timeout = 3 * SECONDS,
        intent = 'success',
        position = Position.BOTTOM_RIGHT,
        manager
    }) {
        this.message = message;
        this.icon = icon;
        this.timeout = timeout;
        this.intent = intent;
        this.position = position;
        this.manager = manager;
    }

    /**
     * Flag set by ToastManager upon showing a Toast
     */
    @action
    onShow() {
        this.isShown = true;
    }

    /**
     * Flag set by ToastManager upon dismissing a Toast
     */
    @action
    onDismiss() {
        this.isDismissed = true;
        if (this.manager) this.manager.cullToasts();
    }

}
