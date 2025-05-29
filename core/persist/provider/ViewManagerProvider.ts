/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {pull} from 'lodash';
import {PersistenceProvider, PersistenceProviderConfig} from '../PersistenceProvider';
import type {ViewManagerModel} from '@xh/hoist/cmp/viewmanager/ViewManagerModel';

export class ViewManagerProvider<S> extends PersistenceProvider<S> {
    readonly viewManagerModel: ViewManagerModel;

    constructor(cfg: PersistenceProviderConfig<S>) {
        const {persistOptions} = cfg,
            {viewManagerModel} = persistOptions;
        throwIf(!viewManagerModel, `ViewManagerProvider requires a 'viewManagerModel'.`);
        super({
            ...cfg,
            persistOptions: {
                ...persistOptions,
                settleTime: persistOptions.settleTime ?? viewManagerModel.settleTime
            }
        });
        this.viewManagerModel = viewManagerModel;
        viewManagerModel.providers.push(this);
    }

    pushStateToTarget() {
        const state = this.read();
        this.target.setPersistableState(state ? state : this.defaultState);
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return this.viewManagerModel.getValue();
    }

    override writeRaw(data: Record<typeof this.path, S>) {
        this.viewManagerModel.setValue(data);
    }

    override destroy() {
        if (this.viewManagerModel) {
            pull(this.viewManagerModel.providers, this);
        }

        super.destroy();
    }
}
