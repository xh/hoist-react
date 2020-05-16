/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {StateProvider} from './StateProvider';
import {XH} from '@xh/hoist/core';

/**
 * State Provider that uses the Hoist preference system for underlying storage.
 */
export class PrefStateProvider extends StateProvider {

    //----------------
    // Implementation
    //----------------
    readDataImpl() {
        return XH.getPref(this.key);
    }

    writeDataImpl(data) {
        XH.setPref(this.key, data);
    }

    clearDataImpl() {
        XH.prefService.unset(this.key);
    }
}