/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action} from 'hoist/mobx';

export class ConfirmModel {

    @observable isOpen = false;
    message = null;
    onConfirm = null;
    onReject = null;

    @action
    doConfirm = () => {
        if (this.onConfirm) this.onConfirm();
        this.close();
    }

    @action
    doReject = () => {
        if (this.onReject) this.onReject();
        this.close();
    }

    @action
    close() {
        this.isOpen = false;
    }

    @action
    show({message, onConfirm, onReject}) {
        console.log('showing');
        this.message = message;
        this.onConfirm = onConfirm;
        this.onReject = onReject;
        this.isOpen = true;
    }

}