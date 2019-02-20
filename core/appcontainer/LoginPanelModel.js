/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, computed, action} from '@xh/hoist/mobx';

/**
 * Support for Forms-based Login.
 *
 *  @private
 */
@HoistModel
export class LoginPanelModel {

    @observable username = '';
    @observable password = '';
    @observable warning = '';

    @computed
    get isValid() {
        return this.username && this.password;
    }

    @action
    setUsername(username) {
        this.username = username;
    }

    @action
    setPassword(password) {
        this.password = password;
    }

    submit() {
        if (!this.isValid) return;

        const {username, password} = this;
        XH.authService.loginAsync(username, password)
            .thenAction(success => {
                this.warning = success ? '' : 'Login Incorrect';
                if (success) {
                    XH.completeInitAsync();
                }
            })
            .catchDefault({
                hideParams: ['password']
            });
    }
}