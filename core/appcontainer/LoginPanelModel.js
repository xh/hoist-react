/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, setter, computed} from '@xh/hoist/mobx';

/**
 * Support for Forms-based Login.
 *
 *  @private
 */
@HoistModel()
export class LoginPanelModel {

    @setter @observable username = '';
    @setter @observable password = '';
    @setter @observable warning = '';

    @computed
    get isValid() {
        return this.username && this.password;
    }

    submit() {
        const {username, password} = this;
        return XH.fetchJson({
            url: 'auth/login',
            params: {username, password}
        }).then(r => {
            this.setWarning(r.success ? '' : 'Login Incorrect');
            if (r.success) {
                XH.completeInitAsync();
            }
        }).catchDefault({
            hideParams: ['password']
        });
    }
}