/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {computed, bindable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';

/**
 * Support for Forms-based Login.
 * @private
 */
@HoistModel
export class LoginPanelModel {

    @bindable username = '';
    @bindable password = '';
    @bindable warning = '';

    @managed loadModel = new PendingTaskModel();

    @computed
    get isValid() {
        return this.username && this.password;
    }

    async submitAsync() {
        const {username, password, loadModel, isValid} = this;
        if (!isValid) return;

        const resp = await XH.fetchJson({
            url: 'xh/login',
            params: {username, password}
        }).linkTo(
            loadModel
        ).catchDefault({
            hideParams: ['password']
        });

        if (resp.success) {
            this.setWarning('');
            XH.completeInitAsync();
        } else {
            this.setWarning('Login incorrect.');
        }
    }
}