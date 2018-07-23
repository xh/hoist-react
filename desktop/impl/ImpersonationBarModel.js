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
    @observable selectedTarget = '';
    @observable targetDialogOpen = false;

    constructor() {
        this.addAutorun(() => {
            if (XH.identityService.isBarVisible) this.ensureTargetsLoaded();
        });
    }

    @action
    toggleVisibility() {
        const svc = XH.identityService;

        this.closeTargetDialog();
        if (svc.isBarVisible) {
            svc.hideBar();
        } else {
            svc.showBar();
        }
    }

    @action
    doImpersonate = () => {
        if (this.selectedTarget) {
            this.closeTargetDialog();
            XH.identityService.impersonateAsync(this.selectedTarget);
        }
    }

    doExit = () => {
        const svc = XH.identityService;
        if (svc.isImpersonating) {
            this.closeTargetDialog();
            svc.endImpersonateAsync();
        } else {
            svc.hideBar();
        }
    }

    //--------------------------
    // Target dialog management
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
    
    @action
    closeTargetDialog = () => {
        this.targetDialogOpen = false;
    }

    @action
    openTargetDialog = () => {
        this.selectedTarget = '';
        this.targetDialogOpen = true;
    }

    @action
    setSelectedTarget = (data) => {
        this.selectedTarget = data;
    }
}