/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {CompoundFilterOperator, FilterLike} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {compact, isEmpty} from 'lodash';
import {HeaderFilterModel} from '../HeaderFilterModel';

import {CustomRowModel} from './CustomRowModel';

export class CustomTabModel extends HoistModel {
    override xhImpl = true;

    headerFilterModel: HeaderFilterModel;

    @bindable op: CompoundFilterOperator = 'AND';
    @observable.ref rowModels: CustomRowModel[] = [];

    /** Filter config output by this model. */
    @computed.struct
    get filter(): FilterLike {
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

    constructor(headerFilterModel: HeaderFilterModel) {
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
        this.rowModels = [new CustomRowModel(this)];
    }

    @action
    addEmptyRow() {
        this.rowModels = [...this.rowModels, new CustomRowModel(this)];
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
    private doSyncWithFilter() {
        const {columnFilters} = this,
            rowModels = [];

        // Create rows based on filter.
        columnFilters.forEach(filter => {
            const {op, value} = filter;
            rowModels.push(new CustomRowModel(this, op, value));
        });

        // Add an empty pending row
        if (isEmpty(rowModels)) {
            rowModels.push(new CustomRowModel(this));
        }

        this.rowModels = rowModels;
    }
}
