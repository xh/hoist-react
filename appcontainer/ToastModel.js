/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Model for a single instance of a Toast.
 *
 * @private
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
        icon = Icon.check(),
        timeout = 3 * SECONDS,
        intent = 'success',
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
    }
}
