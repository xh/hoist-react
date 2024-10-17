/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider, PersistenceProviderConfig} from './';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within a DashViewModel.
 */
export class DashViewProvider<S> extends PersistenceProvider<S> {
    declare dashViewModel;

    override init({dashViewModel}: PersistenceProviderConfig<S>) {
        throwIf(!dashViewModel, `DashViewProvider requires a 'dashViewModel'.`);
        this.dashViewModel = dashViewModel;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        const {viewState} = this.dashViewModel;
        return viewState ?? {};
    }

    override writeRaw(data) {
        this.dashViewModel.setViewState(data);
    }

    override clearRaw() {
        return this.dashViewModel.setViewState(null);
    }
}
