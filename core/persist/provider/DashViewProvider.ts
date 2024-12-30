/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import type {DashViewModel} from '@xh/hoist/desktop/cmp/dash'; // Import type only
import {throwIf} from '@xh/hoist/utils/js';
import {PersistenceProvider, PersistenceProviderConfig} from '../PersistenceProvider';

/**
 * PersistenceProvider that stores state within a DashViewModel.
 */
export class DashViewProvider<S> extends PersistenceProvider<S> {
    readonly dashViewModel: DashViewModel;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        const {dashViewModel} = cfg.persistOptions;
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
        this.dashViewModel.viewState = data;
    }
}
