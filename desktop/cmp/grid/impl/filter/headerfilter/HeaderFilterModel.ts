/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed, lookup} from '@xh/hoist/core';
import {
    CompoundFilter,
    FieldFilter,
    FieldType,
    Filter,
    FilterLike,
    parseFilter,
    Store
} from '@xh/hoist/data';
import {action, computed} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isEmpty} from 'lodash';
import {GridFilterFieldSpec, GridFilterModel} from '@xh/hoist/cmp/grid';
import {customTab} from './custom/CustomTab';
import {CustomTabModel} from './custom/CustomTabModel';
import {valuesTab} from './values/ValuesTab';
import {ValuesTabModel} from './values/ValuesTabModel';
import {ColumnHeaderFilterModel} from '../ColumnHeaderFilterModel';

export class HeaderFilterModel extends HoistModel {
    override xhImpl = true;

    fieldSpec: GridFilterFieldSpec;

    @lookup(ColumnHeaderFilterModel)
    parent: ColumnHeaderFilterModel;

    @managed tabContainerModel: TabContainerModel;
    @managed valuesTabModel: ValuesTabModel;
    @managed customTabModel: CustomTabModel;

    get filterModel(): GridFilterModel {
        return this.parent.filterModel;
    }

    get field(): string {
        return this.fieldSpec.field;
    }

    get store(): Store {
        return this.filterModel.gridModel.store;
    }

    get fieldType(): FieldType {
        return this.store.getField(this.field).type;
    }

    get currentGridFilter(): Filter {
        return this.filterModel.filter;
    }

    get columnFilters(): FieldFilter[] {
        return this.filterModel.getColumnFilters(this.field);
    }

    get columnCompoundFilter(): CompoundFilter {
        return this.filterModel.getColumnCompoundFilter(this.field);
    }

    get hasFilter(): boolean {
        return !isEmpty(this.columnFilters);
    }

    get pendingFilter(): FilterLike {
        const {activeTabId} = this.tabContainerModel;
        return activeTabId === 'valuesFilter'
            ? this.valuesTabModel.filter
            : this.customTabModel.filter;
    }

    get hasPendingFilter(): boolean {
        return !!this.pendingFilter;
    }

    @computed
    get isDirty(): boolean {
        const current = parseFilter(this.columnFilters),
            pending = parseFilter(this.pendingFilter);
        return current ? !current.equals(pending) : !!pending;
    }

    @computed
    get isCustomFilter() {
        const {columnCompoundFilter, columnFilters} = this;
        if (columnCompoundFilter) return true;
        if (isEmpty(columnFilters)) return false;
        return columnFilters.some(it => !['=', '!=', 'includes'].includes(it.op));
    }

    get commitOnChange() {
        return this.filterModel.commitOnChange;
    }

    override onLinked() {
        super.onLinked();
        this.fieldSpec = this.filterModel.getFieldSpec(this.parent.column.field);

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
            ],
            xhImpl: true
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

        this.syncWithFilter();
    }

    @action
    commit(close: boolean = true) {
        const {tabContainerModel, customTabModel, valuesTabModel} = this,
            {activeTabId} = tabContainerModel,
            valuesIsActive = activeTabId === 'valuesFilter',
            activeTabModel = valuesIsActive ? valuesTabModel : customTabModel,
            otherTabModel = valuesIsActive ? customTabModel : valuesTabModel;

        this.setColumnFilters(activeTabModel.filter);
        if (close) {
            this.parent.close();
        } else {
            // We must wait before resetting as GridFilterModel.setFilter() is async
            wait().then(() => otherTabModel?.reset());
        }
    }

    @action
    clear(close: boolean = true) {
        this.setColumnFilters(null);
        if (close) {
            this.parent.close();
        } else {
            // We must wait before resetting as GridFilterModel.setFilter() is async
            wait().then(() => this.resetTabModels());
        }
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    private syncWithFilter() {
        const {isCustomFilter, valuesTabModel, customTabModel, tabContainerModel} = this,
            useCustomTab = isCustomFilter || !valuesTabModel,
            toTab = useCustomTab ? customTabModel : valuesTabModel,
            toTabId = useCustomTab ? 'customFilter' : 'valuesFilter';

        this.resetTabModels();
        toTab.syncWithFilter();

        tabContainerModel.activateTab(toTabId);
    }

    private setColumnFilters(filters) {
        this.filterModel.setColumnFilters(this.field, filters);
    }

    private doCommitOnChange(tab) {
        if (!this.commitOnChange) return;
        if (this.tabContainerModel.activeTabId !== tab) return;
        this.commit(false);
    }

    private resetTabModels() {
        this.customTabModel.reset();
        this.valuesTabModel?.reset();
    }
}
