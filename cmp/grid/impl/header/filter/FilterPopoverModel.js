import {customFilter} from '@xh/hoist/cmp/grid/impl/header/filter/CustomFilter';
import {CustomFilterModel} from '@xh/hoist/cmp/grid/impl/header/filter/CustomFilterModel';
import {enumFilter} from '@xh/hoist/cmp/grid/impl/header/filter/EnumFilter';
import {EnumFilterModel} from '@xh/hoist/cmp/grid/impl/header/filter/EnumFilterModel';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {difference, filter, isEmpty, mapValues, omit, uniqBy, without} from 'lodash';

export class FilterPopoverModel extends HoistModel {
    gridModel;
    xhColumn;
    colId;

    @observable.ref storeFilter = null; // `gridModel.store.filter`

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

    get storeFilter() {
        return this.gridModel.store.filter;
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
        this.processAndSetFilter(filter);
    }

    loadVirtualStore() {
        const {virtualStore, gridModel, colId, enumFilterModel} = this,
            allRecords = gridModel.treeMode ?
                gridModel.store.allRecords
                    .filter(rec => isEmpty(rec.children))
                    .map(rec => rec.data) :
                gridModel.store.allRecords
                    .map(rec => rec.data);

        virtualStore.loadData(allRecords);

        const ret = {};
        uniqBy(allRecords, (rec) => rec[colId])
            .forEach(it => {
                const key = it[colId];
                ret[key] = enumFilterModel.committedFilter[key] ?? true;
            });

        enumFilterModel.setCommittedFilter(ret);
        enumFilterModel.setInitialFilter(mapValues(ret, () => true));
    }

    @action
    processAndSetFilter(filter) {
        const {virtualStore, enumFilterModel, customFilterModel} = this;

        const {colId} = this;
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
                filter.equals(customFilterModel.committedFilter) // Only apply '=' field filter when it is a custom filter
            )
        ) {
            virtualStore.setFilter(filter);
        } else {
            virtualStore.setFilter(null);
        }

        const allVals = uniqBy(virtualStore.allRecords, (rec) => rec.data[colId]),
            visibleVals = uniqBy(virtualStore.records, (rec) => rec.data[colId]),
            hiddenVals = difference(allVals, visibleVals).map(rec => rec.data[colId]),
            currentVals = visibleVals.map(it => ({
                [colId]: it.data[colId],
                isChecked: enumFilterModel.committedFilter[it.data[colId]] || (customFilterModel.committedFilter?.value == it.data[colId] ?? false)
            }));

        // Only load set filter grid with VISIBLE values
        enumFilterModel.gridModel.loadData(currentVals);
        const ret = omit(enumFilterModel.committedFilter, hiddenVals);
        currentVals.forEach(rec => {
            if (!ret.hasOwnProperty(rec[colId])) {
                ret[rec[colId]] = enumFilterModel.committedFilter[rec[colId]] || (customFilterModel.committedFilter?.value == rec[colId] ?? false);
            }
        });
        this.enumFilterModel.setPendingFilter(ret);

        this.storeFilter = filter;
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
            const {store} = this.gridModel;
            this.virtualStore = new Store({...store, loadRootAsSummary: false});

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
                track: () => [store.filter, store.lastUpdated],
                run: ([filter, lastUpdated]) => {
                    if (lastUpdated) this.loadStoreAndUpdateFilter(filter, lastUpdated);
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
