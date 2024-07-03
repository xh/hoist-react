/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {debounced} from '@xh/hoist/utils/js';

/**
 * Supports username/password form-based login.
 * @internal
 */
export class LoginPanelModel extends HoistModel {
    @bindable username = '';
    @bindable password = '';
    @bindable warning = '';
    @bindable loginInProgress = false;

    @managed
    loginTask = TaskObserver.trackLast();

    @computed
    get isValid(): boolean {
        return !!(this.username && this.password);
    }

    constructor() {
        super();
        makeObservable(this);
    }

    // Debounce to defend against double-click fast enough to get through masking + button disable.
    @debounced(300)
    async submitAsync() {
        const {username, password, loginTask, isValid} = this;
        if (!isValid) return;

        try {
            this.loginInProgress = true;
            const success = await XH.authModel
                .loginWithCredentialsAsync(username, password)
                .linkTo(loginTask)
                .catchDefault({
                    hideParams: ['password']
                });

            if (success) {
                this.warning = '';
                await XH.appContainerModel.completeInitAsync();
            } else {
                this.warning = 'Login incorrect.';
            }
        } finally {
            this.loginInProgress = false;
        }
    }
}
