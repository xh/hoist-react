import {customFilter} from '@xh/hoist/cmp/grid/impl/header/filter/CustomFilter';
import {CustomFilterModel} from '@xh/hoist/cmp/grid/impl/header/filter/CustomFilterModel';
import {enumFilter} from '@xh/hoist/cmp/grid/impl/header/filter/EnumFilter';
import {EnumFilterModel} from '@xh/hoist/cmp/grid/impl/header/filter/EnumFilterModel';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {action, bindable, makeObservable} from '@xh/hoist/mobx';
import {filter, isEmpty, without} from 'lodash';

export class FilterPopoverModel extends HoistModel {
    gridModel;
    xhColumn;
    colId;

    /**
     * @member {Store} - Store to be kept in sync with `gridModel.store,` with filters applied
     * to obtain set values for display in enumerated set filter. i.e. excluding any '=' op
     * `FieldFilter` on `colId`. Only filtered `records` will be loaded into `enumFilterGridModel`.
     */
    @managed virtualStore;

    @managed
    tabContainerModel;

    @bindable tabId = null;

    @bindable isOpen = false; // Controlled popover filter menu

    virtualStoreLastUpdated = null; // Kept in sync with `gridModel.store` to avoid unnecessary updates

    get store() {
        return this.gridModel.store;
    }

    get storeFilter() {
        return this.store.filter;
    }

    get isFiltered() {
        const {storeFilter} = this;
        if (!storeFilter) return false;
        return !isEmpty(this.getColFilters(storeFilter.filters ?? [storeFilter]));
    }

    get enumTabActive() {
        return this.tabId == 'enumFilter';
    }

    //---------------------------
    // Filtering Public Actions
    //---------------------------
    openMenu() {
        this.setIsOpen(true);
        this.setTabId('enumFilter');
    }

    closeMenu() {
        this.setIsOpen(false);
    }

    cancel() {
        const {enumFilterModel, customFilterModel} = this;
        enumFilterModel.setPendingFilter(enumFilterModel.committedFilter);
        enumFilterModel.setFilterText(null);
        customFilterModel.setPendingFilter(customFilterModel.committedFilter);
        this.closeMenu();
    }

    reset() {
        if (this.enumTabActive) {
            this.enumFilterModel.reset();
        } else {
            this.customFilterModel.reset();
        }
    }

    commit() {
        if (this.enumTabActive) {
            this.enumFilterModel.commit();
        } else {
            this.customFilterModel.commit();
        }
    }

    //---------------------------
    // Filtering Implementation
    //---------------------------
    loadStoreAndUpdateFilter(filter, lastUpdated) {
        if (this.virtualStoreLastUpdated !== lastUpdated) {
            this.virtualStoreLastUpdated = lastUpdated;
            this.loadVirtualStore();
        }
        this.processFilter(filter);
    }

    loadVirtualStore() {
        const {virtualStore, store} = this,
            {allRecords} = store;

        virtualStore.loadData(
            this.gridModel.treeMode ?
                allRecords.filter(rec => isEmpty(rec.children)).map(rec => rec.data) :
                allRecords.map(rec => rec.data)
        );
    }

    @action
    processFilter(filter) {
        const {colId, virtualStore, customFilterModel} = this;
        if (!filter) {
            virtualStore.setFilter(null);
        } else if (filter.isCompoundFilter) {
            const equalsFilter = this.getEqualsColFilter(filter.filters),
                appliedFilters = without(filter.filters, equalsFilter);
            virtualStore.setFilter({op: 'AND', filters: appliedFilters});
        } else if (
            filter.isFieldFilter &&
            (
                filter.field !== colId ||
                filter.op !== '=' ||
                // TODO - revisit if this is desired behavior
                // Apply '=' field filter when it is a custom filter
                filter.equals(customFilterModel.committedFilter)
            )
        ) {
            virtualStore.setFilter(filter);
        } else {
            virtualStore.setFilter(null);
        }
    }

    //-------------------
    // Implementation
    //-------------------
    constructor({gridModel, xhColumn, agColumn}) {
        super();
        makeObservable(this);

        this.gridModel = gridModel;
        this.xhColumn = xhColumn;
        this.colId = agColumn.colId;

        if (xhColumn.field === this.colId) {
            this.virtualStore = new Store({...this.store, loadRootAsSummary: false});

            this.enumFilterModel = new EnumFilterModel(this);
            this.customFilterModel = new CustomFilterModel(this);

            this.tabContainerModel = new TabContainerModel({
                tabs: [
                    {
                        id: 'enumFilter',
                        title: 'Values',
                        content: () => enumFilter({model: this.enumFilterModel})
                    },
                    {
                        id: 'customFilter',
                        title: 'Custom',
                        content: () => customFilter({model: this.customFilterModel})
                    }
                ],
                switcher: false
            });

            this.addReaction({
                track: () => [this.storeFilter, this.store.lastUpdated],
                run: ([storeFilter, lastUpdated]) => {
                    if (lastUpdated) this.loadStoreAndUpdateFilter(storeFilter, lastUpdated);
                },
                fireImmediately: true
            });

            this.addReaction({
                track: () => this.tabId,
                run: (tabId) => this.tabContainerModel.activateTab(tabId)
            });
        }
    }

    getColFilters(filters) {
        return filter(filters, {field: this.colId});
    }

    getEqualsColFilter(filters) {
        return this.getColFilters(filters).find(it => it.op === '=');
    }
}
