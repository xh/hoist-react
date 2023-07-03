/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppState, AppSuspendData, HoistModel, XH} from '@xh/hoist/core';
import {action, observable, when as mobxWhen} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {getClientDeviceInfo, logDebug} from '@xh/hoist/utils/js';
import {reaction as mobxReaction} from 'mobx/dist/api/autorun';
import parser from 'ua-parser-js';

/**
 * Support for Core Hoist Application state and loading.
 *
 * @internal
 */
export class AppStateModel extends HoistModel {
    override xhImpl = true;

    @observable appState: AppState = 'PRE_AUTH';

    lastActivityMs: number = Date.now();
    suspendData: AppSuspendData;

    constructor() {
        super();
        this.bindInitSequenceToAppLoadModel();
        this.trackLoad();
        this.createActivityListeners();
    }

    @action
    setAppState(nextState: AppState) {
        if (this.appState === nextState) return;

        logDebug(`Application State change: ${this.appState} → ${nextState}`, this);
        this.appState = nextState;
    }

    /**
     * Suspend all app activity and display, including timers and web sockets.
     *
     * Suspension is a terminal state, requiring user to reload the app.
     * Used for idling, forced version upgrades, and ad-hoc killing of problematic clients.
     * @internal
     */
    suspendApp(suspendData: AppSuspendData) {
        if (this.appState === 'SUSPENDED') return;
        this.suspendData = suspendData;
        this.setAppState('SUSPENDED');
        XH.webSocketService.shutdown();
        Timer.cancelAll();
    }


    trackLoad() {
        let loadStarted = window['_xhLoadTimestamp'], // set in index.html
            loginStarted = null,
            loginElapsed = 0;

        const disposer = mobxReaction(
            () => this.appState,
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
    private bindInitSequenceToAppLoadModel() {
        const terminalStates: AppState[] = ['RUNNING', 'SUSPENDED', 'LOAD_FAILED', 'ACCESS_DENIED'],
            loadingPromise = mobxWhen(() => terminalStates.includes(this.appState));
        loadingPromise.linkTo(XH.appLoadModel);
    }

    private createActivityListeners() {
        ['keydown', 'mousemove', 'mousedown', 'scroll', 'touchmove', 'touchstart'].forEach(name => {
            window.addEventListener(name, () => {
                this.lastActivityMs = Date.now();
            });
        });
    }
}
