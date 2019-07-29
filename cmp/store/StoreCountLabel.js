/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {box} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {Component} from 'react';

/**
 * Displays the number of (post-filtered) records loaded into a Store.
 *
 * Using with a Grid? {@see GridCountLabel} for an alternative that also displays selection count.
 */
@HoistComponent
@LayoutSupport
export class StoreCountLabel extends Component {

    static propTypes = {

        /** Store to which this component should bind. */
        store: PT.instanceOf(Store),

        /**
         * True to count nested child records.
         * If false (default) only root records will be included in count.
         */
        includeChildren: PT.bool,

        /** Units label appropriate for records being counted (e.g. "user" -> "50 users"). */
        unit: PT.string
    };

    defaultUnit = 'record';
    baseClassName = 'xh-store-count-label';

    constructor(props) {
        super(props);

        const unit = withDefault(props.unit, this.defaultUnit);
        this._oneUnit = singularize(unit);
        this._manyUnits = pluralize(unit);
    }

    get store() {return this.props.store}

    render() {
        return box({
            ...this.getLayoutProps(),
            className: this.getClassName(),
            item: `${this.getRecCountString()}`
        });
    }


    //------------------------
    // Implementation
    //------------------------
    getRecCountString() {
        const {store} = this,
            includeChildren = withDefault(this.props.includeChildren, false),
            count = includeChildren ? store.count : store.rootCount,
            unitLabel = count === 1 ? this._oneUnit : this._manyUnits;

        return `${this.fmtCount(count)} ${unitLabel}`;
    }

    fmtCount(count) {
        return fmtNumber(count, {precision: 0});
    }

}
export const storeCountLabel = elemFactory(StoreCountLabel);
