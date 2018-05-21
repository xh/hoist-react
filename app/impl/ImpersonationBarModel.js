/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';

@HoistModel()
export class ImpersonationBarModel {
    @observable isVisible = false;

    @observable.ref targets = [];
    @observable selectedTarget = '';
    @observable targetDialogOpen = false;

    constructor() {
        this.isVisible = XH.identityService.isImpersonating;
        if (this.isVisible) this.ensureTargetsLoaded();
    }

    @action
    toggleVisibility() {
        this.targetDialogOpen = false;
        this.isVisible = !this.isVisible || XH.identityService.isImpersonating;
        if (this.isVisible) this.ensureTargetsLoaded();
    }

    @action
    doImpersonate = () => {
        if (this.selectedTarget) {
            this.closeTargetDialog();
            XH.identityService.impersonateAsync(this.selectedTarget);
        }
    }

    doExit = () => {
        if (XH.identityService.isImpersonating) {
            this.closeTargetDialog();
            XH.identityService.endImpersonateAsync();
        } else {
            this.toggleVisibility();
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
            .filter(t => t !== XH.identityService.username);
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