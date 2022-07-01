/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, bindable, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {compact, isEmpty} from 'lodash';

import {CustomRowModel} from './CustomRowModel';

export class CustomTabModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    headerFilterModel;

    @bindable op = 'AND';
    @observable.ref rowModels = [];

    /**
     * @member {Object} - Filter config output by this model
     */
    @computed.struct
    get filter() {
        const {op, rowModels} = this,
            filters = compact(rowModels.map(it => it.value));
        if (isEmpty(filters)) return null;
        if (filters.length > 1) return {filters, op};
        return filters;
    }

    get fieldSpec() {
        return this.headerFilterModel.fieldSpec;
    }

    get currentGridFilter() {
        return this.headerFilterModel.currentGridFilter;
    }

    get columnFilters() {
        return this.headerFilterModel.columnFilters;
    }

    constructor(headerFilterModel) {
        super();
        makeObservable(this);
        this.headerFilterModel = headerFilterModel;
    }

    syncWithFilter() {
        this.doSyncWithFilter();
    }

    @action
    reset() {
        XH.safeDestroy(this.rowModels);
        this.rowModels = [new CustomRowModel({parentModel: this})];
    }

    @action
    addEmptyRow() {
        this.rowModels = [...this.rowModels, new CustomRowModel({parentModel: this})];
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
        const {columnFilters, columnCompoundFilter} = this,
            rowModels = [];

        // Create rows based on filter.
        columnFilters.forEach(filter => {
            const {op, value} = filter;
            rowModels.push(new CustomRowModel({parentModel: this, op, value}));
        });

        // Rehydrate operator from CompoundFilter
        if (columnCompoundFilter) {
            this.op = columnCompoundFilter.op;
        }

        // Add an empty pending row
        if (isEmpty(rowModels)) {
            rowModels.push(new CustomRowModel({parentModel: this}));
        }

        this.rowModels = rowModels;
    }
}
