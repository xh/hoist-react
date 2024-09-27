/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {cloneDeep} from 'lodash';
import {PersistenceProvider, PersistOptions} from './';
import {throwIf} from '@xh/hoist/utils/js';
import {PersistenceManagerModel} from './persistenceManager';

/**
 * PersistenceProvider that stores state for PersistenceManager.
 */
export class PersistenceManagerProvider extends PersistenceProvider {
    persistenceManagerModel: PersistenceManagerModel;

    constructor({persistenceManagerModel, ...rest}: PersistOptions) {
        throwIf(
            !persistenceManagerModel,
            `PersistenceManagerProvider requires a 'persistenceManagerModel'.`
        );
        super(rest);
        this.persistenceManagerModel = persistenceManagerModel;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        const {pendingValue, value} = this.persistenceManagerModel;
        return cloneDeep(pendingValue ?? value ?? {});
    }

    override writeRaw(data) {
        this.persistenceManagerModel.mergePendingValue(data);
    }
}
