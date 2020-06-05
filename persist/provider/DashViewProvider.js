/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider} from './PersistenceProvider';
import {throwIf} from '../../utils/js';

/**
 * PersistenceProvider that stores state within a DashView.
 */
export class DashViewProvider extends PersistenceProvider {

    dashViewModel;

    constructor({dashViewModel, ...rest}) {
        throwIf(!dashViewModel, `Persistence Provider requires a 'dashViewModel'.`);
        super(rest);
        this.dashViewModel = dashViewModel;
    }

    //----------------
    // Implementation
    //----------------
    readRaw() {
        const {viewState} = this.dashViewModel;
        return viewState ?? {};
    }

    writeRaw(data) {
        this.dashViewModel.setViewState(data);
    }

    clearRaw() {
        return this.dashViewModel.setViewState(null);
    }
}