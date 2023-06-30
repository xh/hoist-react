/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {logDebug} from '@xh/hoist/utils/js';
import {computed} from 'mobx';

/**
 * This service offers observable access to the five states of a page's lifecycle, which change
 * due to changes to the focused/visible state of the browser tab and the browser window as a whole,
 * as well as built-in browser behaviors around navigation and performance optimizations.
 *
 * Apps can react to this service's public getters to pause background processes (e.g. expensive
 * refresh operations) when the app is no longer visible to the user and resume them when the user
 * switches back and re-activates the tab.
 *
 * The {@link LifeCycleState} type lists the possible states, with descriptive comments.
 * See {@link https://developer.chrome.com/blog/page-lifecycle-api/} for a useful overview.
 */
export class PageLifecycleService extends HoistService {
    static instance: PageLifecycleService;

    @observable private _state: LifeCycleState;

    get state(): LifeCycleState {
        return this._state;
    }

    constructor() {
        super();
        makeObservable(this);

        this._state = this.getLiveState();
        this.startListeners();
    }

    @computed
    get pageIsActive(): boolean {
        return this.state === 'active';
    }

    @computed
    get pageIsPassive(): boolean {
        return this.state === 'passive';
    }

    @computed
    get pageIsVisible(): boolean {
        return this.pageIsActive || this.pageIsPassive;
    }

    //------------------------
    // Implementation
    //------------------------
    private getLiveState() {
        if (document.visibilityState === 'hidden') {
            return 'hidden';
        }
        if (document.hasFocus()) {
            return 'active';
        }
        return 'passive';
    }

    @action
    private setState(nextState) {
        if (this._state === nextState) return;

        logDebug(`State change: ${this._state} → ${nextState}`, this);
        this._state = nextState;
    }

    // See article linked in doc comment above for details on these event handlers.
    private startListeners() {
        const opts = {capture: true};

        ['pageshow', 'focus', 'blur', 'visibilitychange', 'resume'].forEach(type => {
            window.addEventListener(type, () => this.setState(this.getLiveState()), opts);
        });

        window.addEventListener('freeze', () => this.setState('frozen'), opts);

        window.addEventListener(
            'pagehide',
            e => this.setState(e.persisted ? 'frozen' : 'terminated'),
            opts
        );
    }
}

export type LifeCycleState =
    /**
     * Window/tab is visible and focused.
     */
    | 'active'
    /**
     * Window/tab is visible but not focused - i.e. the browser is visible on the screen and this
     * tab is active, but another application in the OS is currently focused, or the user is
     * interacting with controls in the browser outside of this page, like the URL bar.
     */
    | 'passive'
    /**
     * Window/tab is not visible - browser is either on another tab within the same window, or the
     * entire browser is minimized or hidden behind another application in the OS.
     */
    | 'hidden'
    /**
     * Page has been frozen by the browser due to inactivity (as a perf/memory/power optimization)
     * or because the user has navigated away and the page is in the back/forward cache (but not
     * yet completely unloaded / terminated).
     */
    | 'frozen'
    /**
     * The page is in the process of being unloaded by the browser (this is a terminal state x_x).
     */
    | 'terminated';
