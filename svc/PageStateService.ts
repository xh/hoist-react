/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistService, PageState} from '@xh/hoist/core';
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
export class PageStateService extends HoistService {
    static instance: PageStateService;

    @observable state: PageState;

    constructor() {
        super();
        makeObservable(this);

        this.state = this.getLiveState();
        this.addListeners();
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
    //
    // Based on https://developer.chrome.com/blog/page-lifecycle-api/
    //------------------------
    @action
    private setState(nextState: PageState) {
        if (this.state === nextState) return;

        logDebug(`Page State change: ${this.state} → ${nextState}`, this);
        this.state = nextState;
    }

    private getLiveState(): 'hidden' | 'active' | 'passive' {
        return document.visibilityState === 'hidden'
            ? 'hidden'
            : document.hasFocus()
            ? 'active'
            : 'passive';
    }

    private addListeners() {
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
