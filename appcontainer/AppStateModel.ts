/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppState, AppSuspendData, HoistModel, XH} from '@xh/hoist/core';
import {action, makeObservable, observable, reaction} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {getClientDeviceInfo} from '@xh/hoist/utils/js';
import {isBoolean, isString} from 'lodash';

/**
 * Support for Core Hoist Application state and loading.
 *
 * @internal
 */
export class AppStateModel extends HoistModel {
    override xhImpl = true;

    @observable state: AppState = 'PRE_AUTH';

    lastActivityMs: number = Date.now();
    suspendData: AppSuspendData;
    accessDeniedMessage: string = 'Access Denied';

    constructor() {
        super();
        makeObservable(this);
        this.trackLoad();
        this.createActivityListeners();
    }

    @action
    setAppState(nextState: AppState) {
        if (this.state !== nextState) {
            this.logDebug(`AppState change`, `${this.state} → ${nextState}`);
        }
        this.state = nextState;
    }

    suspendApp(suspendData: AppSuspendData) {
        if (this.state === 'SUSPENDED') return;
        this.suspendData = suspendData;
        this.setAppState('SUSPENDED');
        XH.webSocketService.shutdown();
        Timer.cancelAll();
        XH.appContainerModel.appLoadModel.clear();
    }

    checkAccess(): boolean {
        const user = XH.getUser(),
            {checkAccess} = XH.appSpec;

        if (isString(checkAccess)) {
            if (user.hasRole(checkAccess)) return true;
            this.accessDeniedMessage = `User needs the role "${checkAccess}" to access this application.`;
            return false;
        } else {
            const ret = checkAccess(user);
            if (isBoolean(ret)) return ret;
            if (ret.message) {
                this.accessDeniedMessage = ret.message;
            }
            return ret.hasAccess;
        }
    }

    //------------------
    // Implementation
    //------------------
    private trackLoad() {
        let loadStarted = window['_xhLoadTimestamp'], // set in index.html
            loginStarted = null,
            loginElapsed = 0;

        const disposer = reaction(
            () => this.state,
            state => {
                const now = Date.now();
                switch (state) {
                    case 'RUNNING':
                        XH.track({
                            category: 'App',
                            message: `Loaded ${XH.clientAppCode}`,
                            elapsed: now - loadStarted - loginElapsed,
                            data: {
                                appVersion: XH.appVersion,
                                appBuild: XH.appBuild,
                                locationHref: window.location.href,
                                ...getClientDeviceInfo()
                            },
                            logData: ['appVersion', 'appBuild'],
                            omit: !XH.appSpec.trackAppLoad
                        });
                        disposer();
                        break;
                    case 'LOGIN_REQUIRED':
                        loginStarted = now;
                        break;
                    default:
                        if (loginStarted) loginElapsed = now - loginStarted;
                }
            }
        );
    }

    //---------------------
    // Implementation
    //---------------------
    private createActivityListeners() {
        ['keydown', 'mousemove', 'mousedown', 'scroll', 'touchmove', 'touchstart'].forEach(name => {
            window.addEventListener(name, () => {
                this.lastActivityMs = Date.now();
            });
        });
    }
}
