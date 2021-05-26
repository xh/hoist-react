import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {CompoundFilter, FieldFilter} from '@xh/hoist/data';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {clone, compact, isEmpty, isEqual, keys, pickBy, uniq, without} from 'lodash';

export class EnumFilterModel extends HoistModel {
    /** @member {FilterPopoverModel} */
    parentModel;
    colId;
    xhColumn;

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of record values to add
     * or remove from `gridModel.store.filter`
     */
    @managed @observable.ref
    gridModel;
    /**
     * @member {Object} Key-value pairs of enumerated value to boolean, indicating whether value is
     * checked/unchecked (i.e. included in '=' `FieldFilter`)
     */
    @bindable.ref initialFilter = {}; // All `virtualStore` record values for column (with no filter applied, all true)
    @bindable.ref committedFilter = {}; // All `virtualStore` record values in committed filter state
    @observable.ref pendingFilter = {}; // Local state of enumerated values loaded in `gridModel`

    @bindable filterText = null; // Bound search term for `StoreFilterField`

    get store() {
        return this.parentModel.gridModel.store;
    }

    get storeFilter() {
        return this.parentModel.storeFilter;
    }

    get virtualStore() {
        return this.parentModel.virtualStore;
    }

    get type() {
        return this.virtualStore.getField(this.colId).type;
    }

    @computed
    get allVisibleRecsChecked() {
        if (!this.gridModel) return false;

        const {records} = this.gridModel.store;
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
    @action
    toggleNode(isChecked, value) {
        const {pendingFilter} = this,
            currValue = {
                ...pendingFilter,
                [value]: isChecked
            };
        this.setPendingFilter(currValue);
    }

    @action
    toggleBulk(isChecked) {
        const {records} = this.gridModel.store,
            ret = clone(this.pendingFilter);
        for (let rec of records) {
            ret[rec.id] = isChecked;
        }
        this.setPendingFilter(ret);
    }

    @action
    reset() {
        this.committedFilter = {};
        this.setPendingFilter(this.initialFilter);
        this.commit();
    }

    @action
    commit() {
        const {pendingFilter, colId, type, parentModel} = this,
            {customFilterModel} = parentModel,
            ret = clone(this.committedFilter);

        let pendingStoreFilter = null;

        // Sync committed set filter with new pending values
        for (const val in pendingFilter) {
            ret[val] = pendingFilter[val];
        }
        this.committedFilter = ret;

        let value = keys(pickBy(ret, v => v));
        // Include any equal input values from custom filter
        if (customFilterModel.committedFilter?.op === '=') {
            value.push(customFilterModel.committedFilter.value);
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

        const {storeFilter, store} = this,
            fieldFilter = !isEqual(ret, this.initialFilter) ?
                new FieldFilter({
                    field: this.colId,
                    value,
                    op: '='
                }) :
                null;

        if (storeFilter?.isCompoundFilter) {
            const equalsFilter = parentModel.getEqualsColFilter(storeFilter.filters),
                newFilters = compact([...without(storeFilter.filters, equalsFilter), fieldFilter]);

            pendingStoreFilter = newFilters.length > 1 ?
                new CompoundFilter({filters: newFilters, op: 'AND'}) :
                newFilters[0];
        } else if (storeFilter?.isFieldFilter && storeFilter.field !== colId && fieldFilter) {
            pendingStoreFilter = new CompoundFilter({filters: [storeFilter, fieldFilter], op: 'AND'});
        } else if (customFilterModel.committedFilter?.op !== '=' && fieldFilter) {
            pendingStoreFilter = new CompoundFilter({filters: [fieldFilter, customFilterModel.committedFilter], op: 'AND'});
        } else {
            pendingStoreFilter = fieldFilter;
        }

        store.setFilter(pendingStoreFilter);
    }

    //---------------------------
    // Filtering Implementation
    //---------------------------
    @action
    setPendingFilter(currValue) {
        const {pendingFilter, gridModel} = this;
        if (isEqual(currValue, pendingFilter)) return;

        this.pendingFilter = currValue;
        const ret = [];
        for (const key in currValue) {
            if (gridModel.store.getById(key)) {
                ret.push({
                    id: key,
                    isChecked: currValue[key]
                });
            }
        }
        gridModel.store.modifyRecords(ret);
    }

    createGridModel() {
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

    //-------------------
    // Implementation
    //-------------------
    constructor(parentModel) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
        this.colId = parentModel.colId;
        this.xhColumn = parentModel.xhColumn;

        this.gridModel = this.createGridModel();
    }
}
