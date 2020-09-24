/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * A minimal Persistence provider for use by apps that wish to implement the actual persistence
 * of the backing data via custom handlers.
 *
 * This provider allows applications to use the Persistence API to populate and read state from
 * components without actually writing to any pre-defined storage.
 */
export class ManualProvider extends PersistenceProvider {

    getData;
    setData;

    /**
     * @param {function} getData - function returning blob of data to be used for reading state.
     * @param {function} setData - function to be used to write blob of data representing state.
     */
    constructor({getData, setData, ...rest}) {
        throwIf(!getData || !setData, `ManualProvider requires a 'getData' and a 'setData' function.`);
        super(rest);
        this.getData = getData;
        this.setData = setData;
    }

    //----------------
    // Implementation
    //----------------
    readRaw() {
        return this.getData();
    }

    writeRaw(data) {
        this.setData(data);
    }

    clearRaw() {
        this.setData(null);
    }
}
