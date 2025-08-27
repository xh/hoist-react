/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, PageState} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Implementation of PageState maintenance.
 *
 * Based on https://developer.chrome.com/blog/page-lifecycle-api/
 *
 * @internal
 */
export class PageStateModel extends HoistModel {
    override xhImpl = true;

    @observable state: PageState = null;

    constructor() {
        super();
        makeObservable(this);

        this.setState(this.getLiveState());
        this.addListeners();
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private setState(nextState: PageState) {
        if (this.state == 'terminated' || this.state == nextState) return;

        this.logDebug(`PageState change: ${this.state} → ${nextState}`);
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
