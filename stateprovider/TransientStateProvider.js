/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {StateProvider} from './StateProvider';

/**
 * StateProvider that will store state in memory only.
 *
 * This state will last for the lifetime of this object only. It is
 * useful for components that wish to provide default "session only"
 * state as needed.
 */
export class TransientStateProvider extends StateProvider {

    value = null;

    //----------------
    // Implementation
    //----------------
    readDataImpl() {
        return this.value;
    }

    writeDataImpl(data) {
        this.value = data;
    }

    clearDataImpl() {
        this.value = null;
    }
}