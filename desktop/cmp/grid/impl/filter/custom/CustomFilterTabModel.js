/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, bindable, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {combineValueFilters} from '@xh/hoist/data';
import {castArray, compact, isEmpty, every} from 'lodash';

import {CustomFilterRowModel} from './CustomFilterRowModel';

export class CustomFilterTabModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    parentModel;

    @bindable op = 'AND';
    @observable.ref rowModels = [];

    /**
     * @member {Object} - Filter config output by this model
     */
    @computed.struct
    get filter() {
        const {op, rowModels} = this,
            filters = combineValueFilters(compact(rowModels.map(it => it.value)));
        if (isEmpty(filters)) return null;
        if (filters.length > 1 && op === 'OR') return {filters, op};
        return filters;
    }

    @computed
    get implicitJoinMessage() {
        let equalsCount = 0, notEqualsCount = 0, likeCount = 0;
        this.rowModels.forEach(it => {
            if (it.op === '=') equalsCount++;
            if (it.op === '!=') notEqualsCount++;
            if (it.op === 'like') likeCount++;
        });

        if (this.op === 'AND' && (equalsCount > 1 || likeCount > 1)) {
            return 'Multiple `=` and `like` filters will be joined using OR.';
        } else if (this.op === 'OR' && notEqualsCount > 1) {
            return 'Multiple `!=` filters will be joined using AND.';
        }
        return null;
    }

    get fieldSpec() {
        return this.parentModel.fieldSpec;
    }

    get currentFilter() {
        return this.parentModel.currentFilter;
    }

    get columnFilters() {
        return this.parentModel.columnFilters;
    }

    constructor(parentModel) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
    }

    syncWithFilter() {
        this.doSyncWithFilter();
    }

    @action
    reset() {
        XH.safeDestroy(this.rowModels);
        this.rowModels = [new CustomFilterRowModel({parentModel: this})];
    }

    @action
    addEmptyRow() {
        this.rowModels = [...this.rowModels, new CustomFilterRowModel({parentModel: this})];
    }

    @action
    removeRow(model) {
        this.rowModels = this.rowModels.filter(it => it.xhId !== model.xhId);
        XH.safeDestroy(model);
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    doSyncWithFilter() {
        const {columnFilters, currentFilter} = this,
            rowModels = [];

        // Create rows based on filter.
        columnFilters.forEach(filter => {
            const {op, value} = filter;
            if (op === '=' || op === 'like') {
                castArray(value).forEach(it => {
                    rowModels.push(new CustomFilterRowModel({parentModel: this, op, value: it}));
                });
            } else {
                rowModels.push(new CustomFilterRowModel({parentModel: this, op, value}));
            }
        });

        // Rehydrate operator from CompoundFilter
        if (columnFilters.length > 1) {
            const compoundFilter = this.getOuterCompoundFilter(currentFilter);
            if (compoundFilter) this.op = compoundFilter.op;
        }

        // Add an empty pending row
        if (isEmpty(rowModels)) {
            rowModels.push(new CustomFilterRowModel({parentModel: this}));
        }

        this.rowModels = rowModels;
    }

    // Find the CompoundFilter that wraps the filters for this column
    getOuterCompoundFilter(filter) {
        if (!filter.isCompoundFilter) return null;

        // This is the outer compound filter if all its children
        // are FieldFilters on this field.
        const {field} = this.fieldSpec;
        if (every(filter.filters, it => it.field === field)) {
            return filter;
        }

        // Otherwise, check any CompoundFilter children
        const results = compact(filter.filters.map(it => this.getOuterCompoundFilter(it)));
        return results.length === 1 ? results[0] : null;
    }
}