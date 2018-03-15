/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults} from 'lodash';

export class StoreCountLabelModel {

    defaultUnitConfig = {
        singular: 'record',
        plural: 'records'
    }

    constructor({store, unitConfig}) {
        this.store = store;
        this.unitConfig = defaults(unitConfig, this.defaultUnitConfig);
    }

}