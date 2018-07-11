/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {box} from '@xh/hoist/layout';
import {fmtNumber} from '@xh/hoist/format';
import {singularize, pluralize} from '@xh/hoist/utils/JsUtils';

import {BaseStore} from '@xh/hoist/data';

/**
 * A component to display the number of records in a given store.
 * Will auto-update with changes to the count, including store filtering.
 */
@HoistComponent({layoutSupport: true})
class StoreCountLabel extends Component {

    static propTypes = {
        /** Store to count */
        store: PT.instanceOf(BaseStore).isRequired,
        /** Name of entity that record in store represents */
        unit: PT.string
    };

    defaultUnit = 'record';

    constructor(props) {
        super(props);
        const unit = props.unit || this.defaultUnit;
        this.oneUnit = singularize(unit);
        this.manyUnits = pluralize(unit);
    }

    render() {
        const store = this.props.store,
            count = store.count,
            countStr = fmtNumber(count, {precision: 0}),
            unitLabel = count === 1 ? this.oneUnit : this.manyUnits;

        return box({
            layoutConfig: this.layoutConfig,
            item: `${countStr} ${unitLabel}`
        });
    }
}

export const storeCountLabel = elemFactory(StoreCountLabel);