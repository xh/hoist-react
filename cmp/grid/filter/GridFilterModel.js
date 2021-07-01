/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, find, isEmpty, isFunction} from 'lodash';

/**
 * Model for managing a Grid's column filters.
 */
export class GridFilterModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {(Store|View)} */
    valueSource;
    /** @member {(Store|View)} */
    target;

    /** @return {Filter} */
    get filter() {
        return this.hasTarget ? this.target.filter : this._filter;
    }

    /** @return {boolean} */
    get hasTarget() {
        return !isNil(this.target);
    }

    // Private filter state, used when `target` is not defined
    @observable.ref _filter;

    /**
     * @param {Object} c - GridFilterModel configuration.
     * @param {GridModel} c.gridModel - GridModel instance which owns this model.
     * @param {(Store|View)} [c.valueSource] - Store or cube View to be used to provide suggested
     *      data values in column filters (if configured).
     * @param {(Store|View)} [c.target] - Store or cube View that should actually be filtered
     *      as column filters are applied. May be the same as `valueSource`. Provide 'null' if you
     *      wish to combine this model's filter with other filters, send it to the server, or otherwise
     *      observe and handle filter changes manually.
     * @param {(Filter|* |[]|function)} [c.initialFilter] - Configuration for a filter appropriate
     *      to be rendered and managed by GridFilterModel, or a function to produce the same.
     */
    constructor({
        gridModel,
        valueSource,
        target,
        initialFilter = null
    }) {
        super();
        makeObservable(this);

        throwIf(!gridModel, 'GridFilterModel requires a GridModel');

        this.gridModel = gridModel;
        this.valueSource = valueSource;
        this.target = target;

        const filter = isFunction(initialFilter) ? initialFilter() : initialFilter;
        this.setFilter(filter);
    }

    /**
     * Set the filter on the target
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    setFilter(filter) {
        if (this.hasTarget) {
            this.target.setFilter(filter);
        } else {
            this._filter = filter;
        }
    }

    /**
     * Set / replace the filters for a given column on the target
     * @param {string} colId - colId to identify this filter
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    setColumnFilter(colId, filter) {
        const {gridModel} = this;

        throwIf(
            !gridModel.findColumn(gridModel.columns, colId),
            `Column with colId ${colId} not found in grid columns`
        );

        const currFilter = this.filter,
            currFilters = currFilter?.isCompoundFilter ? currFilter.filters : [currFilter],
            newFilters = [];

        // Strip out any existing filters for this colId
        currFilters.forEach(filter => {
            if (!filter) return;
            if (filter.isFieldFilter && filter.field === colId) return;
            if (filter.isCompoundFilter && find(filter.filters, it => it.field === colId)) return;
            newFilters.push(filter);
        });

        // Add in new filter
        if (filter) newFilters.push(filter);

        // Create compound filter if necessary
        let newFilter = null;
        if (!isEmpty(newFilters)) {
            newFilter = newFilters.length > 1 ? {filters: newFilters, op: 'AND'} : newFilters[0];
        }

        this.setFilter(newFilter);
    }

}