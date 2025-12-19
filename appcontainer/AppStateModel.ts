/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {AppState, AppSuspendData, HoistModel, PlainObject, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {camelCase, isBoolean, isString, mapKeys, pick} from 'lodash';

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

    /**
     * Timestamp when the app first started loading, prior to even JS download/eval.
     * Read from timestamp set on window within index.html.
     */
    readonly loadStarted: number = window['_xhLoadTimestamp'];
    readonly timings: Record<AppState, number> = {} as Record<AppState, number>;

    private lastStateChangeTime: number = this.loadStarted;

    constructor() {
        super();
        makeObservable(this);
        this.trackLoad();
        this.createActivityListeners();
    }

    @action
    setAppState(nextState: AppState) {
        if (this.state === nextState) return;

        const {state, timings, lastStateChangeTime} = this,
            now = Date.now();
        timings[state] = (timings[state] ?? 0) + now - lastStateChangeTime;
        this.lastStateChangeTime = now;
        this.state = nextState;
        this.logDebug(`AppState change`, `${state} → ${nextState}`);
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
        const {timings, loadStarted} = this;
        this.addReaction({
            when: () => this.state === 'RUNNING',
            run: () =>
                XH.track({
                    category: 'App',
                    message: `Loaded ${XH.clientAppCode}`,
                    timestamp: loadStarted,
                    elapsed: Date.now() - loadStarted - (timings.LOGIN_REQUIRED ?? 0),
                    data: {
                        timings: mapKeys(timings, (v, k) => camelCase(k)),
                        clientHealth: XH.clientHealthService.getReport(),
                        window: this.getWindowData(),
                        screen: this.getScreenData()
                    },
                    omit: !XH.appSpec.trackAppLoad
                })
        });
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

    private getScreenData(): PlainObject {
        const screen = window.screen as any;
        if (!screen) return null;

        const ret: PlainObject = pick(screen, [
            'availWidth',
            'availHeight',
            'width',
            'height',
            'colorDepth',
            'pixelDepth',
            'availLeft',
            'availTop'
        ]);
        if (screen.orientation) {
            ret.orientation = pick(screen.orientation, ['angle', 'type']);
        }
        return ret;
    }

    private getWindowData(): PlainObject {
        return pick(window, [
            'devicePixelRatio',
            'screenX',
            'screenY',
            'innerWidth',
            'innerHeight',
            'outerWidth',
            'outerHeight'
        ]);
    }
}
