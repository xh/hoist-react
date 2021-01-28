/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {debounced} from '@xh/hoist/utils/js';

/**
 * Support for Forms-based Login.
 * @private
 */
export class LoginPanelModel extends HoistModel {

    @bindable username = '';
    @bindable password = '';
    @bindable warning = '';
    @bindable loginInProgress = false;

    @managed loadModel = new PendingTaskModel();

    @computed
    get isValid() {
        return this.username && this.password;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    // Debounce to defend against double-click fast enough to get through masking + button disable.
    @debounced(300)
    async submitAsync() {
        const {username, password, loadModel, isValid} = this;
        if (!isValid) return;

        try {
            this.setLoginInProgress(true);
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
                await XH.completeInitAsync();
            } else {
                this.setWarning('Login incorrect.');
            }
        } finally {
            this.setLoginInProgress(false);
        }

    }
}
