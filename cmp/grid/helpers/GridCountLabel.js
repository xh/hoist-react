/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {GridModel} from '@xh/hoist/cmp/grid';
import {box} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {Component} from 'react';

/**
 * Displays the number of records loaded into a grid's store + (configurable) selection count.
 *
 * Alternative to more general {@see StoreFilterField}.
 */
@HoistComponent
@LayoutSupport
export class GridCountLabel extends Component {

    static propTypes = {

        /** GridModel to which this component should bind. */
        gridModel: PT.instanceOf(GridModel),

        /**
         * True to count nested child records.
         * If false (default) only root records will be included in count.
         */
        includeChildren: PT.bool,

        /**
         * Control display of selection count after overall records count: auto (default) to display
         * count when > 1, or always/never to show/hide regardless of current count.
         */
        showSelectionCount: PT.oneOf(['always', 'never', 'auto']),

        /** Units label appropriate for records being counted (e.g. "user" -> "50 users"). */
        unit: PT.string
    };

    defaultUnit = 'record';
    baseClassName = 'xh-grid-count-label';

    constructor(props) {
        super(props);

        const unit = props.unit || this.defaultUnit;
        this._oneUnit = singularize(unit);
        this._manyUnits = pluralize(unit);
    }

    get store() {
        return this.gridModel.store;
    }

    get gridModel() {
        return this.props.gridModel;
    }

    render() {
        if (!this.store) return null;

        return box({
            ...this.getLayoutProps(),
            className: this.getClassName(),
            item: `${this.getRecCountString()} ${this.getSelCountString()}`
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

    getSelCountString() {
        const count = this.gridModel.selection.length,
            countStr = count ? this.fmtCount(count) : 'none',
            showCountProp = withDefault(this.props.showSelectionCount, 'auto'),
            showCount = showCountProp == 'always' || (showCountProp == 'auto' && count > 1);

        return showCount ? ` (${countStr} selected)` : '';
    }

    fmtCount(count) {
        return fmtNumber(count, {precision: 0});
    }
}
export const gridCountLabel = elemFactory(GridCountLabel);
