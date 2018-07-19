/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';

/**
 * @private
 */
@HoistModel()
export class ImpersonationBarModel {
    @observable.ref targets = [];

    constructor() {
        this.addAutorun(() => {
            if (XH.identityService.isBarVisible) this.ensureTargetsLoaded();
        });
    }

    @action
    doImpersonate = (target) => {
        const svc = XH.identityService;
        svc.hideBar();
        svc.impersonateAsync(target);
    }

    doExit = () => {
        const svc = XH.identityService;
        if (svc.isImpersonating) {
            svc.endImpersonateAsync();
        } else {
            svc.hideBar();
        }
    }

    //--------------------------
    // Target management
    //--------------------------
    ensureTargetsLoaded() {
        if (this.targets.length) return;

        XH.fetchJson({
            url: 'hoistImpl/impersonationTargets'
        }).then(
            this.setTargets
        ).catchDefault();
    }

    @action
    setTargets = (targets) => {
        this.targets = targets
            .map(t => t.username)
            .filter(t => t !== XH.identityService.username)
            .sort();
    }

}