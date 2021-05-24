import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {customFilter} from '@xh/hoist/cmp/grid/impl/FilterPopover';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed} from '@xh/hoist/core';
import {CompoundFilter, FieldFilter, Store} from '@xh/hoist/data';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {
    clone,
    compact,
    difference,
    filter,
    isArray,
    isEmpty,
    isEqual,
    isNull,
    keys,
    mapValues,
    omit,
    pickBy,
    uniq,
    uniqBy,
    without
} from 'lodash';

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

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of record values to add
     * or remove from `gridModel.store.filter`
     */
    @managed @observable.ref
    enumFilterGridModel;

    @managed
    tabContainerModel = new TabContainerModel({
        tabs: [
            {
                id: 'enumFilter',
                title: 'Set',
                content: () => grid({
                    model: this.enumFilterGridModel,
                    height: 226,
                    width: 240 // TODO - fix styling
                })
            },
            {
                id: 'customFilter',
                title: 'Custom',
                content: () => customFilter({model: this})
            }
        ],
        switcher: false
    });
    @bindable tabId = null;

    @bindable isOpen = false; // Controlled popover filter menu

    /**
     * @member {Object} Key-value pairs of enumerated value to boolean, indicating whether value is
     * checked/unchecked (i.e. included in '=' `FieldFilter`)
     */
    _initialEnumFilter = {}; // All `virtualStore` record values for column (with no filter applied, all true)
    @observable.ref committedEnumFilter = {}; // All `virtualStore` record values in committed filter state
    @observable.ref pendingEnumFilter = {}; // Local state of enumerated values loaded in `enumFilterGridModel`

    @bindable filterText = null; // Bound search term for `enumFilterGridModel`'s `StoreFilterField`
    virtualStoreLastUpdated = null; // Kept in sync with `gridModel.store` to avoid unnecessary updates

    // Custom Filter support
    @bindable op = '!=';
    @bindable inputVal = null;
    @bindable committedCustomFilter = null;

    get isFiltered() {
        if (!this.storeFilter) return false;
        return !isEmpty(this.getColFilters(this.storeFilter.filters ?? [this.storeFilter]));
    }

    get customFilter() {
        if (!this.op || isNull(this.inputVal)) return null;
        return new FieldFilter({
            field: this.colId,
            op: this.op,
            value: this.inputVal.toString().trim()
        });
    }

    get type() {
        return this.virtualStore.getField(this.colId).type;
    }

    @computed
    get allVisibleRecsChecked() {
        if (!this.enumFilterGridModel) return false;

        const {records} = this.enumFilterGridModel.store;
        if (isEmpty(records)) {
            return false;
        }
        const isChecked = records[0].data.isChecked;
        for (let record of records) {
            if (record.data.isChecked !== isChecked) return null;
        }
        return isChecked;
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

    @action
    toggleNode(isChecked, value) {
        const {pendingEnumFilter} = this,
            currValue = {
                ...pendingEnumFilter,
                [value]: isChecked
            };
        this.setPendingEnumFilter(currValue);
    }

    @action
    toggleBulk(isChecked) {
        const {records} = this.enumFilterGridModel.store,
            ret = clone(this.pendingEnumFilter);
        for (let rec of records) {
            ret[rec.id] = isChecked;
        }
        this.setPendingEnumFilter(ret);
    }

    @action
    resetEnumFilter() {
        this.committedEnumFilter = {};
        this.setPendingEnumFilter(this._initialEnumFilter);
        this.commitEnumFilter();
    }

    @action
    resetCustomFilter() {
        this.inputVal = null;
        this.commitCustomFilter();
    }

    @action
    cancelAndUndoFilters() {
        this.setPendingEnumFilter(this.committedEnumFilter);
        this.setPendingCustomFilter(this.committedCustomFilter);
        this.filterText = null;
        this.closeMenu();
    }

    @action
    commitCustomFilter() {
        const {customFilter, colId, gridModel, op, committedCustomFilter} = this,
            {store} = gridModel,
            {filter} = store;

        // If existing store filter, remove committed custom filter if any,
        // or remove custom input value OR'd with any '=' field filter
        if (filter) {
            const currStoreFilters = filter?.filters ?? [filter],
                colFilters = this.getColFilters(currStoreFilters),
                currCommittedCustomFilter = colFilters?.find(it => it.equals(committedCustomFilter)),
                currEqualsFilterIncludingCustomValue = colFilters?.find(it => (
                    isArray(it.value) ?
                        it.value.includes(committedCustomFilter?.value) :
                        it.value === committedCustomFilter?.value) && it.op === '=');

            if (currCommittedCustomFilter) {
                const newFilters = compact([
                    ...without(currStoreFilters, ...colFilters),
                    ...without(colFilters, currCommittedCustomFilter)
                ]);
                this.storeFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    newFilters;
            } else if (currEqualsFilterIncludingCustomValue) {
                const newValue = without(currEqualsFilterIncludingCustomValue.value, committedCustomFilter.value),
                    newEqualFieldFilter = new FieldFilter({
                        field: this.colId,
                        value: newValue,
                        op: '='
                    }),
                    newFilters = compact([
                        ...without(currStoreFilters, ...colFilters),
                        ...without(colFilters, currEqualsFilterIncludingCustomValue),
                        newEqualFieldFilter
                    ]);
                this.storeFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    newFilters;
            }
            if (isEmpty(this.storeFilter)) this.storeFilter = null;
        }
        // 1) Set new filter with current committed filter removed
        if (!customFilter) {
            this.committedCustomFilter = null;
            store.setFilter(this.storeFilter);
            // Re-commit existing set filter
            this.commitEnumFilter();
            return;
        }

        // 2) Apply new custom filter
        if (filter?.isCompoundFilter) {
            const equalsFilter = this.getEqualsColFilter(filter.filters);
            if (equalsFilter && op === '=') {
                const newFilters = compact([...without(filter.filters, equalsFilter), customFilter]);
                this.storeFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    customFilter;
            } else {
                const newFilters = [...filter.filters, customFilter];
                this.storeFilter = new CompoundFilter({filters: newFilters, op: 'AND'});
            }
        } else if (filter?.isFieldFilter && (filter.field !== colId || op !== '=')) {
            this.storeFilter = new CompoundFilter({filters: [filter, customFilter], op: 'AND'});
        } else {
            this.storeFilter = customFilter;
        }
        // If custom filter is '=', mark value as checked in committed set filter
        if (customFilter?.op === '=' && this.committedEnumFilter.hasOwnProperty(customFilter.value)) {
            this.committedEnumFilter[customFilter.value] = true;
        }
        this.committedCustomFilter = customFilter;
        store.setFilter(this.storeFilter);
    }

    @action
    commitEnumFilter() {
        const {pendingEnumFilter, colId, type, gridModel, committedCustomFilter} = this,
            ret = clone(this.committedEnumFilter);

        // Sync committed set filter with new pending values
        for (const val in pendingEnumFilter) {
            ret[val] = pendingEnumFilter[val];
        }
        this.committedEnumFilter = ret;

        let value = keys(pickBy(ret, v => v));
        // Include any equal input values from custom filter
        if (committedCustomFilter?.op === '=') {
            value.push(committedCustomFilter.value);
            value = uniq(value);
        }
        // Parse boolean strings to their primitive values
        if (type === 'bool') {
            value = value.map(it => {
                if (it === 'true') return true;
                if (it === 'false') return false;
                return null;
            });
        }

        const {store} = gridModel,
            {filter} = store,
            fieldFilter = !isEqual(ret, this._initialEnumFilter) ?
                new FieldFilter({
                    field: this.colId,
                    value,
                    op: '='
                }) :
                null;

        if (filter?.isCompoundFilter) {
            const equalsFilter = this.getEqualsColFilter(filter.filters),
                newFilters = compact([...without(filter.filters, equalsFilter), fieldFilter]);

            this.storeFilter = newFilters.length > 1 ?
                new CompoundFilter({filters: newFilters, op: 'AND'}) :
                newFilters[0];
        } else if (filter?.isFieldFilter && filter.field !== colId && fieldFilter) {
            this.storeFilter = new CompoundFilter({filters: [filter, fieldFilter], op: 'AND'});
        } else if (committedCustomFilter?.op !== '=' && fieldFilter) {
            this.storeFilter = new CompoundFilter({filters: [fieldFilter, committedCustomFilter], op: 'AND'});
        } else {
            this.storeFilter = fieldFilter;
        }

        store.setFilter(this.storeFilter);
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
        const {virtualStore, gridModel, colId, committedEnumFilter} = this,
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
                ret[key] = committedEnumFilter[key] ?? true;
            });

        this.committedEnumFilter = ret;
        this._initialEnumFilter = mapValues(ret, () => true);
    }

    @action
    processAndSetFilter(filter) {
        const {enumFilterGridModel, virtualStore, committedEnumFilter, committedCustomFilter} = this;
        if (!enumFilterGridModel) return;

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
                filter.equals(committedCustomFilter) // Only apply '=' field filter when it is a custom filter
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
                isChecked: committedEnumFilter[it.data[colId]] || (committedCustomFilter?.value == it.data[colId] ?? false)
            }));

        // Only load set filter grid with VISIBLE values
        enumFilterGridModel.loadData(currentVals);
        const ret = omit(committedEnumFilter, hiddenVals);
        currentVals.forEach(rec => {
            if (!ret.hasOwnProperty(rec[colId])) {
                ret[rec[colId]] = committedEnumFilter[rec[colId]] || (committedCustomFilter?.value == rec[colId] ?? false);
            }
        });
        this.setPendingEnumFilter(ret);
    }

    @action
    setPendingEnumFilter(currValue) {
        const {pendingEnumFilter, enumFilterGridModel} = this;
        if (isEqual(currValue, pendingEnumFilter)) return;

        this.pendingEnumFilter = currValue;
        const ret = [];
        for (const key in currValue) {
            if (enumFilterGridModel.store.getById(key)) {
                ret.push({
                    id: key,
                    isChecked: currValue[key]
                });
            }
        }
        enumFilterGridModel.store.modifyRecords(ret);
    }

    @action
    setPendingCustomFilter(fieldFilter) {
        this.op = fieldFilter?.op ?? '!=';
        this.inputVal = fieldFilter?.value ?? null;
    }

    createEnumFilterGridModel() {
        const {renderer, rendererIsComplex, headerName} = this.xhColumn; // Render values as they are in `gridModel`
        return new GridModel({
            store: {
                idSpec: (raw) => raw[this.colId].toString(),
                fields: [
                    this.colId,
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'disabled',
            emptyText: 'No records found...',
            contextMenu: null,
            sizingMode: 'compact',
            stripeRows: false,
            sortBy: this.colId,
            columns: [
                {
                    field: 'isChecked',
                    sortable: false,
                    headerName: ({gridModel}) => {
                        const {store} = gridModel;
                        return checkbox({
                            disabled: store.empty,
                            displayUnsetState: true,
                            value: this.allVisibleRecsChecked,
                            onChange: () => this.toggleBulk(!this.allVisibleRecsChecked)
                        });
                    },
                    width: 30,
                    rendererIsComplex: true,
                    elementRenderer: (v, {record}) => {
                        return checkbox({
                            displayUnsetState: true,
                            value: record.data.isChecked,
                            onChange: () => this.toggleNode(!v, record.id)
                        });
                    }
                },
                {
                    field: this.colId,
                    flex: 1,
                    headerName,
                    renderer, // TODO - handle cases like bool check col where rendered values look null
                    rendererIsComplex
                }
            ]
        });
    }

    getColFilters(filters) {
        return filter(filters, {field: this.colId});
    }

    getEqualsColFilter(filters) {
        return this.getColFilters(filters).find(it => it.op === '=');
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

            this.enumFilterGridModel = this.createEnumFilterGridModel();
            this.virtualStore = new Store({...store, loadRootAsSummary: false});

            this.addReaction({
                track: () => [store.filter, store.lastUpdated],
                run: ([filter, lastUpdated]) => {
                    if (lastUpdated) this.loadStoreAndUpdateFilter(filter, lastUpdated);
                }
            });

            this.addReaction({
                track: () => this.tabId,
                run: (tabId) => this.tabContainerModel.activateTab(tabId)
            });
        }
    }
}
