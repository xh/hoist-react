/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {StateProvider} from './StateProvider';

/**
 * StateProvider that stores state within a DashView
 */
export class DashViewStateProvider extends StateProvider {

    dashViewModel;

    constructor({dashViewModel, key, subKey}) {
        super({key, subKey});
        this.dashViewModel = dashViewModel;
    }

    //----------------
    // Implementation
    //----------------
    readDataImpl() {
        return this.dashViewModel.viewState[this.key] ?? null;
    }

    writeDataImpl(data) {
        this.dashViewModel.setViewStateKey(this.key, data);
    }

    clearDataImpl() {
        this.dashViewModel.setViewStateKey(this.key, null);
    }
}