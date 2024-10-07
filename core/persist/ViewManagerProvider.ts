/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {cloneDeep} from 'lodash';
import {PersistenceProvider, PersistOptions} from './';
import {throwIf} from '@xh/hoist/utils/js';
import {ViewManagerModel} from './viewManager';

/**
 * PersistenceProvider that stores state for ViewManager.
 */
export class ViewManagerProvider extends PersistenceProvider {
    viewManagerModel: ViewManagerModel;

    override get isWriteStateImmediately(): boolean {
        return true;
    }

    constructor({viewManagerModel, ...rest}: PersistOptions) {
        throwIf(!viewManagerModel, `ViewManagerProvider requires a 'viewManagerModel'.`);
        super(rest);
        this.viewManagerModel = viewManagerModel;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        const {pendingValue, value} = this.viewManagerModel;
        return cloneDeep(pendingValue ?? value ?? {});
    }

    override writeRaw(data) {
        this.viewManagerModel.mergePendingValue(data);
    }
}
