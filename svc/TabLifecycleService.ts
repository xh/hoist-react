/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {observable, runInAction} from 'mobx';

/**
 * Manage the idling/suspension of this application after a certain period of user inactivity
 * to cancel background tasks and prompt the user to reload the page when they wish to resume
 * using the app. This approach is typically employed to reduce potential load on back-end
 * system from unattended clients and/or as a "belt-and-suspenders" defence against memory
 * leaks or other performance issues that can arise with long-running sessions.
 *
 * This service consults the `xhIdleConfig` soft-config and the `xhIdleDetectionDisabled`
 * user preference to determine if and when it should suspend the app.
 */
export class TabLifecycleService extends HoistService {
    override xhImpl = true;
    static instance: TabLifecycleService;

    @observable private _state: string;
    get state() {
        return this._state;
    }

    @observable private _lastActivityMs: number;
    get lastActivityMs() {
        return this.state === 'active' ? Date.now() : this._lastActivityMs;
    }

    constructor() {
        super();

        this._state = this.getLiveState();

        this.addReaction({
            when: () => XH.appIsRunning,
            run: this.startMonitoring
        });
    }

    //------------------------
    // Implementation
    //------------------------

    // This state & event detection taken from the example at
    // https://developer.chrome.com/blog/page-lifecycle-api/
    private getLiveState() {
        if (document.visibilityState === 'hidden') {
            return 'hidden';
        }
        if (document.hasFocus()) {
            return 'active';
        }
        return 'passive';
    }

    private logStateChange = nextState => {
        const prevState = this.state;
        if (nextState !== prevState) {
            console.log(`State change: ${prevState} >>> ${nextState}`);
            if (prevState === 'active') {
                runInAction(() => (this._lastActivityMs = Date.now()));
            }
            runInAction(() => (this._state = nextState));
        }
    };

    private startMonitoring() {
        // Options used for all event listeners.
        const opts = {capture: true};

        // These lifecycle events can all use the same listener to observe state
        // changes.
        ['pageshow', 'focus', 'blur', 'visibilitychange', 'resume'].forEach(type => {
            window.addEventListener(type, () => this.logStateChange(this.getLiveState()), opts);
        });

        // The next two listeners, on the other hand, can determine the next
        // state from the event itself.
        window.addEventListener(
            'freeze',
            () => {
                // In the freeze event, the next state is always frozen.
                this.logStateChange('frozen');
            },
            opts
        );

        window.addEventListener(
            'pagehide',
            event => {
                // If the event's persisted property is `true` the page is about
                // to enter the back/forward cache, which is also in the frozen state.
                // If the event's persisted property is not `true` the page is
                // about to be unloaded.
                this.logStateChange(event.persisted ? 'frozen' : 'terminated');
            },
            opts
        );
    }
}
