/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import '@xh/hoist/mobile/register';
import {HoistModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {MultiZoneGridModel} from '../MultiZoneGridModel';

/**
 * Todo
 */
export class MultiZoneMapperModel extends HoistModel {
    multiZoneGridModel: MultiZoneGridModel;

    @observable isOpen = false;

    constructor({multiZoneGridModel}) {
        super();
        makeObservable(this);
        this.multiZoneGridModel = multiZoneGridModel;
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    commit() {
        console.log('commit');
    }

    reset() {
        console.log('reset');
    }
}
