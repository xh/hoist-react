/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, bindable, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {FieldFilter, flattenFilter} from '@xh/hoist/data';
import {compact, isEmpty, isNull} from 'lodash';

import {CustomFilterRowModel} from './CustomFilterRowModel';

export class CustomFilterTabModel extends HoistModel {
    /** @member {FilterPopoverModel} */
    parentModel;

    @bindable op = 'AND';
    @observable.ref rowModels = [];
    @observable.ref committedValue = null;

    /**
     * @member {Object} - Filter config output by this model
     */
    @computed.struct
    get filter() {
        return this.committedValue;
    }

    /**
     * @member {Object} - Local state for uncommitted filter config
     */
    get pendingValue() {
        const filters = compact(this.rowModels.map(it => it.value));
        if (isEmpty(filters)) return null;
        const {op} = this;
        return filters.length > 1 ? {filters, op} : filters[0];
    }

    get customFilter() {
        if (!this.op || isNull(this.inputVal)) return null;
        return new FieldFilter({
            field: this.colId,
            op: this.op,
            value: this.inputVal.toString().trim()
        });
    }

    get store() {
        return this.parentModel.store;
    }

    get storeFilter() {
        return this.parentModel.storeFilter;
    }

    get colId() {
        return this.parentModel.colId;
    }

    get type() {
        return this.parentModel.type;
    }

    constructor(parentModel) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;

        this.addReaction({
            track: () => this.storeFilter,
            run: () => this.syncState(),
            fireImmediately: true
        });
    }

    @action
    commit() {
        this.committedValue = this.pendingValue;
    }

    @action
    reset() {
        XH.safeDestroy(this.rowModels);
        this.rowModels = [new CustomFilterRowModel({parentModel: this})];
        this.commit();
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
    syncState() {
        const {storeFilter, colId} = this,
            rowModels = [];

        // Create rows based on store filter.
        if (storeFilter) {
            const columnFilters = flattenFilter(storeFilter).filter(it => it.field === colId);
            columnFilters.forEach(filter => {
                if (filter.op === '=') return; // Skip equals filters, these are handled by enum tab
                rowModels.push(new CustomFilterRowModel({parentModel: this, ...filter}));
            });
        }

        // Add an empty pending row
        if (isEmpty(rowModels)) {
            rowModels.push(new CustomFilterRowModel({parentModel: this}));
        }

        this.rowModels = rowModels;
        this.commit();
    }
}