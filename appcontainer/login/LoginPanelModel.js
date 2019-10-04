/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, computed, bindable} from '@xh/hoist/mobx';

/**
 * Support for Forms-based Login.
 *
 *  @private
 */
@HoistModel
export class LoginPanelModel {

    @bindable username = '';
    @bindable password = '';
    @observable warning = '';

    @computed
    get isValid() {
        return this.username && this.password;
    }

    submit() {
        if (!this.isValid) return;

        const {username, password} = this;
        XH.fetchJson({
            url: 'xh/login',
            params: {username, password}
        }).thenAction(r => {
            this.warning = r.success ? '' : 'Login Incorrect';
            if (r.success) {
                XH.completeInitAsync();
            }
        }).catchDefault({
            hideParams: ['password']
        });
    }
}