/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {observable, action, computed, makeObservable} from '@xh/hoist/mobx';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {wait} from '@xh/hoist/promise';
import {isEmpty} from 'lodash';

import {customFilterTab} from './custom/CustomFilterTab';
import {CustomFilterTabModel} from './custom/CustomFilterTabModel';
import {valuesFilterTab} from './values/ValuesFilterTab';
import {ValuesFilterTabModel} from './values/ValuesFilterTabModel';

export class ColumnHeaderFilterModel extends HoistModel {
    filterModel; // Todo: Rename gridFilterModel
    column;
    fieldSpec;

    @observable.ref filter = null;
    @observable isOpen = false;
    @observable showMask = false;

    @managed tabContainerModel;
    @managed valuesFilterTabModel;
    @managed customFilterTabModel;

    get field() {
        return this.fieldSpec.field;
    }

    // Todo: rename currentGridFilter
    get currentFilter() {
        return this.filterModel.filter;
    }

    get columnFilters() {
        return this.filterModel.getColumnFilters(this.field);
    }

    get valueSource() {
        return this.filterModel.valueSource;
    }

    get hasFilter() {
        return !isEmpty(this.columnFilters);
    }

    get hasPendingFilter() {
        if (this.tabContainerModel.activeTabId === 'valuesFilter') {
            return !!this.valuesFilterTabModel.filter;
        } else {
            return !!this.customFilterTabModel.filter;
        }
    }

    @computed
    get isCustomFilter() {
        const {columnFilters} = this;
        if (isEmpty(columnFilters)) return false;
        return columnFilters.some(it => !['=', '!='].includes(it.op));
    }

    constructor({filterModel, column}) {
        super();
        makeObservable(this);

        this.filterModel = filterModel;
        this.column = column;
        this.fieldSpec = filterModel.getFieldSpec(column.field);

        this.valuesFilterTabModel = new ValuesFilterTabModel(this);
        this.customFilterTabModel = new CustomFilterTabModel(this);
        this.tabContainerModel = new TabContainerModel({
            switcher: false,
            tabs: [
                {
                    id: 'valuesFilter',
                    title: 'Values',
                    content: valuesFilterTab
                },
                {
                    id: 'customFilter',
                    title: 'Custom',
                    content: customFilterTab
                }
            ]
        });
    }

    @action
    commit() {
        let filter;
        if (this.tabContainerModel.activeTabId === 'valuesFilter') {
            filter = this.valuesFilterTabModel.filter;
        } else {
            filter = this.customFilterTabModel.filter;
        }

        // Applying filter can take time for large datasets.
        // Show a mask to provide feedback to user.
        this.showMask = true;
        wait(1).then(() => {
            this.setColumnFilters(filter);
            this.closeMenu();
        });
    }

    @action
    clear(close = true) {
        this.setColumnFilters(null);
        if (close) {
            this.closeMenu();
        } else {
            this.syncWithFilter();
        }
    }

    @action
    openMenu() {
        this.isOpen = true;
        this.showMask = false;
        this.syncWithFilter();
    }

    @action
    closeMenu() {
        this.isOpen = false;
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    syncWithFilter() {
        const {columnFilters, isCustomFilter, fieldSpec} = this,
            useCustomFilterTab = isCustomFilter || !fieldSpec.enableValues;

        this.valuesFilterTabModel.reset();
        this.customFilterTabModel.reset();

        if (!isEmpty(columnFilters)) {
            if (useCustomFilterTab) {
                // There are column filters that can only be represented on the custom filter tab
                this.customFilterTabModel.syncWithFilter();
            } else {
                // There is a column filter that can be represented on the values filter tab
                this.valuesFilterTabModel.syncWithFilter();
            }
        }

        const tab = useCustomFilterTab ? 'customFilter' : 'valuesFilter';
        this.tabContainerModel.activateTab(tab);
    }

    setColumnFilters(filters) {
        this.filterModel.setColumnFilters(this.field, filters);
    }
}