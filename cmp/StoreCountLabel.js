/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';
import {singularize, pluralize} from 'hoist/utils/JsUtils';

import {BaseStore} from 'hoist/data';

/**
 * A Component that can bind to any store, provides a label for the records count
 */
@hoistComponent()
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
            unitLabel = count === 1 ? this.oneUnit : this.manyUnits;
        return label(`${count} ${unitLabel}`);
    }
}

export const storeCountLabel = elemFactory(StoreCountLabel);