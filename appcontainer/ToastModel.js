/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Model for a single instance of a displayed Toast.
 *
 * This model is returned by XH.toast() and its variants (e.g. XH.successToast()).
 *
 * This object is primarily useful for its dismiss() method, which can be called at any time to
 * programmatically dismiss a toast. The properties on this object should be considered immutable
 * and will not effect the displayed toast.
 *
 */
export class ToastModel extends HoistModel {

    // Immutable public properties
    icon = null;
    message = null;
    timeout = null;
    intent = null;
    position = null;
    containerRef = null;

    @observable isOpen = true;

    constructor({
        message,
        icon,
        timeout = 3 * SECONDS,
        intent = 'primary',
        position = null,
        containerRef = null
    }) {
        super();
        makeObservable(this);
        this.message = message;
        this.icon = icon;
        this.timeout = timeout;
        this.intent = intent;
        this.position = position;
        this.containerRef = containerRef;
    }

    @action
    dismiss() {
        this.isOpen = false;
    }

    destroy() {
        this.dismiss();
        super.destroy();
    }
}
