/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

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
export class PageLifecycleService extends HoistService {
    override xhImpl = true;
    static instance: PageLifecycleService;

    @observable private _state: string;
    get state() {
        return this._state;
    }

    constructor() {
        super();
        makeObservable(this);

        this._state = this.getLiveState();
        this.startListeners();
    }

    get pageIsActive(): boolean {
        return this.state === 'active';
    }

    get pageIsPassive(): boolean {
        return this.state === 'passive';
    }

    get pageIsVisible(): boolean {
        return this.pageIsActive || this.pageIsPassive;
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

    @action
    private setState(nextState) {
        this._state = nextState;
    }

    private startListeners() {
        // Options used for all event listeners.
        const opts = {capture: true};

        // These lifecycle events can all use the same listener to observe state
        // changes.
        ['pageshow', 'focus', 'blur', 'visibilitychange', 'resume'].forEach(type => {
            window.addEventListener(type, () => this.setState(this.getLiveState()), opts);
        });

        // The next two listeners, on the other hand, can determine the next
        // state from the event itself.
        window.addEventListener(
            'freeze',
            () => {
                // In the freeze event, the next state is always frozen.
                this.setState('frozen');
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
                this.setState(event.persisted ? 'frozen' : 'terminated');
            },
            opts
        );
    }
}
