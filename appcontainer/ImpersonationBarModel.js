/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, bindable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 *  Manage Impersonation.
 *
 *  @private
 */
export class ImpersonationBarModel extends HoistModel {

    @observable showRequested = false;
    @observable.ref targets = [];
    @bindable pendingTarget = null;

    constructor() {
        super();
        makeObservable(this);
    }

    init() {
        this.addAutorun(() => {
            if (this.isOpen) {
                this.ensureTargetsLoaded();

                // We don't have an impersonation message on mobile, so instead we
                // display the currently impersonated user in the dropdown.
                if (XH.isMobileApp && XH.identityService.isImpersonating) {
                    this.pendingTarget = XH.getUsername();
                }
            }
        });
    }

    get isOpen() {
        return this.showRequested || XH.identityService.isImpersonating;
    }

    @action
    show() {
        throwIf(!XH.identityService.canAuthUserImpersonate, 'User does not have right to impersonate or impersonation is disabled.');
        this.showRequested = true;
    }

    @action
    hide() {
        this.showRequested = false;
    }

    @action
    toggleVisibility() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }


    //---------------------
    // Handlers
    //---------------------
    onCommit = async () => {
        const {pendingTarget} = this;
        if (!pendingTarget) return;
        try {
            await XH.identityService.impersonateAsync(pendingTarget);
        } catch (e) {
            this.setPendingTarget('');
            XH.handleException(e, {logOnServer: false});  // likely to be an unknown user
        }
    }

    onClose = () => {
        XH.identityService.isImpersonating ? XH.identityService.endImpersonateAsync() : this.hide();
    }


    //--------------------
    // Implementation
    //--------------------
    ensureTargetsLoaded() {
        if (this.targets.length) return;

        XH.fetchJson({
            url: 'xh/impersonationTargets'
        }).then(targets => {
            this.setTargets(targets);
        }).catchDefault();
    }

    @action
    setTargets(targets) {
        this.targets = targets
            .map(t => t.username)
            .filter(t => t !== XH.getUsername())
            .sort();
    }
}
