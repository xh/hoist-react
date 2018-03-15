/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';

/**
 * A Component that can bind to any store, provides a label for the records count
 */
@hoistComponent()
class StoreCountLabel extends Component {

    render() {
        const model =  this.props.storeCountModel,
            count = model.store.count,
            unitConfig = model.unitConfig,
            unitLabel = count === 1 ? unitConfig.singular : unitConfig.plural;
        return label(`${count} ${unitLabel}`);
    }
}

export const storeCountLabel = elemFactory(StoreCountLabel);