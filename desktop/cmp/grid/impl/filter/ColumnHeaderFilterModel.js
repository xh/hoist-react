/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isEmpty} from 'lodash';
import {customTab} from './custom/CustomTab';
import {CustomTabModel} from './custom/CustomTabModel';
import {valuesTab} from './values/ValuesTab';
import {ValuesTabModel} from './values/ValuesTabModel';

export class ColumnHeaderFilterModel extends HoistModel {
    /** @member {GridFilterModel} */
    gridFilterModel;
    /** @member {Column} */
    column;
    /** @member {GridFilterFieldSpec} */
    fieldSpec;

    @observable isOpen = false;

    /** @member {TabContainerModel} */
    @managed tabContainerModel;
    /** @member {ValuesTabModel} */
    @managed valuesTabModel;
    /** @member {CustomTabModel} */
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

    get commitOnChange() {
        return this.gridFilterModel.commitOnChange;
    }

    constructor({filterModel, column}) {
        super();
        makeObservable(this);

        this.gridFilterModel = filterModel;
        this.column = column;
        this.fieldSpec = filterModel.getFieldSpec(column.field);

        const {enableValues} = this.fieldSpec;
        this.valuesTabModel = enableValues ? new ValuesTabModel(this) : null;
        this.customTabModel = new CustomTabModel(this);
        this.tabContainerModel = new TabContainerModel({
            switcher: false,
            tabs: [
                {
                    id: 'valuesFilter',
                    title: 'Values',
                    content: valuesTab,
                    omit: !enableValues
                },
                {
                    id: 'customFilter',
                    title: 'Custom',
                    content: customTab
                }
            ]
        });

        this.addReaction({
            track: () => this.valuesTabModel?.filter,
            run: () => this.doCommitOnChange('valuesFilter'),
            debounce: 100
        });

        this.addReaction({
            track: () => this.customTabModel.filter,
            run: () => this.doCommitOnChange('customFilter'),
            debounce: 100
        });
    }

    @action
    commit(close = true) {
        const {tabContainerModel, customTabModel, valuesTabModel} = this,
            {activeTabId} = tabContainerModel,
            valuesIsActive = activeTabId === 'valuesFilter',
            activeTabModel = valuesIsActive ? valuesTabModel : customTabModel,
            otherTabModel = valuesIsActive ? customTabModel : valuesTabModel;

        this.setColumnFilters(activeTabModel.filter);
        if (close) {
            this.closeMenu();
        } else {
            // We must wait before resetting as GridFilterModel.setFilter() is async
            wait().then(() => otherTabModel?.reset());
        }
    }

    @action
    clear(close = true) {
        this.setColumnFilters(null);
        if (close) {
            this.closeMenu();
        } else {
            // We must wait before resetting as GridFilterModel.setFilter() is async
            wait().then(() => this.resetTabModels());
        }
    }

    @action
    openMenu() {
        this.isOpen = true;
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
        const {isCustomFilter, valuesTabModel, customTabModel, tabContainerModel} = this,
            useCustomTab = isCustomFilter || !valuesTabModel,
            toTab = useCustomTab ? customTabModel : valuesTabModel,
            toTabId = useCustomTab ? 'customFilter' : 'valuesFilter';

        this.resetTabModels();
        toTab.syncWithFilter();

        tabContainerModel.activateTab(toTabId);
    }

    setColumnFilters(filters) {
        this.gridFilterModel.setColumnFilters(this.field, filters);
    }

    doCommitOnChange(tab) {
        if (!this.commitOnChange) return;
        if (this.tabContainerModel.activeTabId !== tab) return;
        this.commit(false);
    }

    resetTabModels() {
        this.customTabModel.reset();
        this.valuesTabModel?.reset();
    }
}
