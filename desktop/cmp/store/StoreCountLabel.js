/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {fmtNumber} from '@xh/hoist/format';
import {singularize, pluralize} from '@xh/hoist/utils/js';
import {GridModel} from '@xh/hoist/cmp/grid';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {BaseStore} from '@xh/hoist/data';

/**
 * A component to display the number of records in a given store.
 *
 * This component will show the post-filtered record count.
 */
@HoistComponent
@LayoutSupport
export class StoreCountLabel extends Component {

    static propTypes = {

        /** Store to count.  Specify this or 'gridModel' */
        store: PT.instanceOf(BaseStore),

        /** GridModel with Store that this control should count. Specify this or 'store' */
        gridModel: PT.instanceOf(GridModel),

        /** True to count nested child records.  If false (default) only root records will be included in count. */
        includeChildren: PT.bool,

        /** Name of entity that record in store represents */
        unit: PT.string
    };

    defaultUnit = 'record';
    baseClassName = 'xh-store-count-label';

    constructor(props) {
        super(props);

        throwIf(props.gridModel && props.store, "Cannot specify both 'gridModel' and 'store' props.");

        const unit = props.unit || this.defaultUnit;
        this.oneUnit = singularize(unit);
        this.manyUnits = pluralize(unit);
    }

    render() {
        const store = this.getActiveStore();
        if (!store) return null;

        const includeChildren = withDefault(this.props.includeChildren, false),
            count = includeChildren ? store.records.length : store.rootRecords.length,
            countStr = fmtNumber(count, {precision: 0}),
            unitLabel = count === 1 ? this.oneUnit : this.manyUnits;

        return box({
            ...this.getLayoutProps(),
            className: this.getClassName(),
            item: `${countStr} ${unitLabel}`
        });
    }


    //---------------------------
    // Implementation
    //------------------------------
    getActiveStore() {
        const {gridModel, store} = this.props;
        return store || (gridModel && gridModel.store);
    }
}

export const storeCountLabel = elemFactory(StoreCountLabel);
