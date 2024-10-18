/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider, PersistenceProviderConfig} from './';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * A minimal Persistence provider for use by apps that wish to implement the actual persistence
 * of the backing data via custom handlers.
 *
 * This provider allows applications to use the Persistence API to populate and read state from
 * components without actually writing to any pre-defined storage.
 */
export class CustomProvider<S> extends PersistenceProvider<S> {
    declare getData;
    declare setData;

    override init({getData, setData, ...rest}: PersistenceProviderConfig<S>) {
        throwIf(
            !getData || !setData,
            `CustomProvider requires a 'getData' and a 'setData' function.`
        );
        this.getData = getData;
        this.setData = setData;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return this.getData();
    }

    override writeRaw(data) {
        this.setData(data);
    }

    override clearRaw() {
        this.setData(null);
    }
}
