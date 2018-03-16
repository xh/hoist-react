/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';
import {defaults} from 'lodash';

/**
 * A Component that can bind to any store, provides a label for the records count
 */
@hoistComponent()
class StoreCountLabel extends Component {

    defaultUnitConfig = {
        singular: 'record',
        plural: 'records'
    }

    render() {
        const store = this.props.store,
            count = store.count,
            unitConfig = defaults(this.props.unitConfig, this.defaultUnitConfig),
            unitLabel = count === 1 ? unitConfig.singular : unitConfig.plural;
        return label(`${count} ${unitLabel}`);
    }
}

export const storeCountLabel = elemFactory(StoreCountLabel);