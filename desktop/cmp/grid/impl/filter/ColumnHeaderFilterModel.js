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

import {customTab} from './custom/CustomTab';
import {CustomTabModel} from './custom/CustomTabModel';
import {valuesTab} from './values/ValuesTab';
import {ValuesTabModel} from './values/ValuesTabModel';

export class ColumnHeaderFilterModel extends HoistModel {
    gridFilterModel;
    column;
    fieldSpec;

    @observable.ref filter = null;
    @observable isOpen = false;
    @observable showMask = false;

    @managed tabContainerModel;
    @managed valuesTabModel;
    @managed customTabModel;

    get field() {
        return this.fieldSpec.field;
    }

    get currentGridFilter() {
        return this.gridFilterModel.filter;
    }

    get columnFilters() {
        return this.gridFilterModel.getColumnFilters(this.field);
    }

    get valueSource() {
        return this.gridFilterModel.valueSource;
    }

    get hasFilter() {
        return !isEmpty(this.columnFilters);
    }

    get hasPendingFilter() {
        const {activeTabId} = this.tabContainerModel;
        return activeTabId === 'valuesFilter' ?
            !!this.valuesTabModel.filter :
            !!this.customTabModel.filter;
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

        this.gridFilterModel = filterModel;
        this.column = column;
        this.fieldSpec = filterModel.getFieldSpec(column.field);

        this.valuesTabModel = new ValuesTabModel(this);
        this.customTabModel = new CustomTabModel(this);
        this.tabContainerModel = new TabContainerModel({
            switcher: false,
            tabs: [
                {
                    id: 'valuesFilter',
                    title: 'Values',
                    content: valuesTab
                },
                {
                    id: 'customFilter',
                    title: 'Custom',
                    content: customTab
                }
            ]
        });
    }

    @action
    commit() {
        const {activeTabId} = this.tabContainerModel,
            {filter} = activeTabId === 'valuesFilter' ? this.valuesTabModel : this.customTabModel;

        // Applying filter can take time for large datasets.
        // Show a mask to provide feedback to user.
        this.showMask = true;
        wait(1).then(() => {
            if (filter) {
                this.setColumnFilters(filter);
            } else {
                this.clearColumnFilters();
            }
            this.closeMenu();
        });
    }

    @action
    clear(close = true) {
        this.clearColumnFilters();
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

        this.valuesTabModel.reset();
        this.customTabModel.reset();

        if (!isEmpty(columnFilters)) {
            if (useCustomFilterTab) {
                // There are column filters that can only be represented on the custom filter tab
                this.customTabModel.syncWithFilter();
            } else {
                // There is a column filter that can be represented on the values filter tab
                this.valuesTabModel.syncWithFilter();
            }
        }

        const tab = useCustomFilterTab ? 'customFilter' : 'valuesFilter';
        this.tabContainerModel.activateTab(tab);
    }

    setColumnFilters(filters) {
        this.gridFilterModel.setColumnFilters(filters);
    }

    clearColumnFilters() {
        this.gridFilterModel.clearColumnFilters(this.field);
    }
}