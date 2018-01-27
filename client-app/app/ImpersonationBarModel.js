/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {wait} from 'hoist/promise';
import {XH, identityService, hoistAppModel} from 'hoist';
import {observable, action} from 'hoist/mobx';

export class ImpersonationBarModel {
    @observable isVisible = false;

    @observable targets = null;
    @observable selectedTarget = '';
    @observable targetDialogOpen = false;

    constructor() {
        this.isVisible = identityService.impersonating;
        if (this.isVisible) this.ensureTargetsLoaded();
    }

    @action
    toggleVisibility = () => {
        this.targetDialogOpen = false;
        this.isVisible = !this.isVisible || identityService.isImpersonating;
        if (this.isVisible) this.ensureTargetsLoaded();
    }

    @action
    doImpersonate = () => {
        if (this.selectedTarget) {
            wait(1000)
                .then(() => identityService.impersonateAsync(this.selectedTarget))
                .bind(hoistAppModel.appLoadModel);
        }
    }

    doExit = () => {
        if (identityService.impersonating) {
            wait(1000)
                .then(() => identityService.endImpersonateAsync())
                .bind(hoistAppModel.appLoadModel);
        } else {
            this.toggleVisibility();
        }
    }

    //--------------------------
    // Target dialog management
    //--------------------------
    ensureTargetsLoaded() {
        if (this.targets != null) return;
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
            .filter(t => t !== identityService.username);
    }


    @action
    closeTargetDialog = () => {
        this.targetDialogOpen = false;
    }

    @action
    openTargetDialog = () => {
        this.targetDialogOpen = true;
    }

    @action
    setSelectedTarget = (data) => {
        this.selectedTarget = data.value;
    }
}