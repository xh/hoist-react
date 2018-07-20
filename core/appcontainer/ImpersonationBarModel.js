/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/JsUtils';

/**
 *  Manage Impersonation.
 *
 *  @private
 */
@HoistModel()
export class ImpersonationBarModel {

    @observable barRequested = false;
    @observable.ref targets = [];

    init() {
        this.addAutorun(() => {
            if (this.isBarVisible) this.ensureTargetsLoaded();
        });
    }

    get isBarVisible() {
        return this.barRequested || this.isImpersonating;
    }

    get isImpersonating() {
        return XH.identityService.isImpersonating;
    }

    get canImpersonate() {
        return XH.identityService.authUser.isHoistAdmin;
    }

    @action
    showBar() {
        this.ensurePermission();
        this.barRequested = true;
    }

    @action
    hideBar() {
        this.barRequested = false;
    }

    /**
     * Begin an impersonation session to act as another user. The UI server will allow this only
     * if the actual authenticated user has the HOIST_ADMIN role, and is attempting to impersonate
     * a known user who has permission to and has accessed the app themselves. If successful,
     * the application will reload and the admin will now be acting as the other user.
     *
     * @param {string} username - the end-user to impersonate
     */
    async impersonateAsync(username) {
        this.ensurePermission();
        return XH.fetchJson({
            url: 'hoistImpl/impersonate',
            params: {
                username: username
            }
        }).then(() => {
            XH.reloadApp();
        }).catchDefault({
            message: 'Failed to impersonate'
        });
    }

    /**
     * Exit any active impersonation, reloading the app to resume normal day-to-day life as yourself.
     */
    async endImpersonateAsync() {
        return XH.fetchJson({
            url: 'hoistImpl/endImpersonate'
        }).then(() => {
            XH.reloadApp();
        }).catchDefault({
            message: 'Failed to end impersonation'
        });
    }

    //--------------------
    // Implementation
    //--------------------
    ensureAdmin() {
        throwIf(!this.canImpersonate, 'User does not have right to impersonate.');
    }

    ensureTargetsLoaded() {
        if (this.targets.length) return;

        XH.fetchJson({
            url: 'hoistImpl/impersonationTargets'
        }).then(targets => {
            this.setTargets(targets);
        }).catchDefault();
    }

    @action
    setTargets(targets) {
        this.targets = targets
            .map(t => t.username)
            .filter(t => t !== XH.identityService.getsername)
            .sort();
    }
}