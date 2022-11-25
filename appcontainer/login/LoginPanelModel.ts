/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {observable, bindable, computed, makeObservable, action} from '@xh/hoist/mobx';
import {debounced} from '@xh/hoist/utils/js';

/**
 * Supports username/password form-based login.
 * @internal
 */
export class LoginPanelModel extends HoistModel {

    @bindable username = '';
    @bindable password = '';

    @observable warning = '';
    @action
    setWarning(s: string) {
        this.warning = s;
    }

    @observable loginInProgress = false;
    @action
    setLoginInProgress(b: boolean) {
        this.loginInProgress = b;
    }

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
            this.setLoginInProgress(true);
            const resp = await XH.fetchJson({
                url: 'xh/login',
                params: {username, password}
            }).linkTo(
                loginTask
            ).catchDefault({
                hideParams: ['password']
            });

            if (resp.success) {
                this.setWarning('');
                await XH.completeInitAsync();
            } else {
                this.setWarning('Login incorrect.');
            }
        } finally {
            this.setLoginInProgress(false);
        }

    }
}
