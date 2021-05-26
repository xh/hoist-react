import {HoistModel} from '@xh/hoist/core';
import {CompoundFilter, FieldFilter} from '@xh/hoist/data';
import {action, bindable, makeObservable} from '@xh/hoist/mobx';
import {clone, compact, isArray, isEmpty, isNull, without} from 'lodash';

export class CustomFilterModel extends HoistModel {
    /** @member {FilterPopoverModel} */
    parentModel;
    colId;

    @bindable op = '!=';
    @bindable inputVal = null;
    @bindable committedFilter = null;

    get store() {
        return this.parentModel.gridModel.store;
    }

    get storeFilter() {
        return this.parentModel.storeFilter;
    }

    get virtualStore() {
        return this.parentModel.virtualStore;
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

    //---------------------------
    // Filtering Public Actions
    //---------------------------
    @action
    reset() {
        this.inputVal = null;
        this.commit();
    }

    @action
    commit() {
        const {customFilter, colId, op, committedFilter, store, storeFilter, parentModel} = this,
            {enumFilterModel} = parentModel;

        let pendingStoreFilter = null;

        // If existing store filter, remove committed custom filter if any,
        // or remove custom input value OR'd with any '=' field filter
        if (storeFilter) {
            const currStoreFilters = storeFilter?.filters ?? [storeFilter],
                colFilters = parentModel.getColFilters(currStoreFilters),
                currCommittedFilter = colFilters?.find(it => it.equals(committedFilter)),
                currEqualsFilterIncludingCustomValue = colFilters?.find(it => (
                    isArray(it.value) ?
                        it.value.includes(committedFilter?.value) :
                        it.value === committedFilter?.value) && it.op === '=');

            if (currCommittedFilter) {
                const newFilters = compact([
                    ...without(currStoreFilters, ...colFilters),
                    ...without(colFilters, currCommittedFilter)
                ]);
                pendingStoreFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    newFilters;
            } else if (currEqualsFilterIncludingCustomValue) {
                const newValue = without(currEqualsFilterIncludingCustomValue.value, committedFilter.value),
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
                pendingStoreFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    newFilters;
            }
            if (isEmpty(pendingStoreFilter)) pendingStoreFilter = null;
        }

        // 1) Set new filter with current committed filter removed
        if (!customFilter) {
            this.committedFilter = null;
            store.setFilter(pendingStoreFilter);
            // Re-commit existing enum filter
            enumFilterModel.commit();
            return;
        }

        // 2) Apply new custom filter
        if (storeFilter?.isCompoundFilter) {
            const equalsFilter = parentModel.getEqualsColFilter(storeFilter.filters);
            if (equalsFilter && op === '=') {
                const newFilters = compact([...without(storeFilter.filters, equalsFilter), customFilter]);
                pendingStoreFilter = newFilters.length > 1 ?
                    new CompoundFilter({filters: newFilters, op: 'AND'}) :
                    customFilter;
            } else {
                const newFilters = [...storeFilter.filters, customFilter];
                pendingStoreFilter = new CompoundFilter({filters: newFilters, op: 'AND'});
            }
        } else if (storeFilter?.isFieldFilter && (storeFilter.field !== colId || op !== '=')) {
            pendingStoreFilter = new CompoundFilter({filters: [storeFilter, customFilter], op: 'AND'});
        } else {
            pendingStoreFilter = customFilter;
        }
        // If custom filter is '=', mark value as checked in committed set filter
        if (customFilter?.op === '=' && enumFilterModel.committedFilter.hasOwnProperty(customFilter.value)) {
            const pendingEnumFilter = clone(enumFilterModel.committedFilter);
            pendingEnumFilter[customFilter.value] = true;
            enumFilterModel.setCommittedFilter(pendingEnumFilter);
        }
        this.committedFilter = customFilter;
        store.setFilter(pendingStoreFilter);
    }


    //---------------------------
    // Filtering Implementation
    //---------------------------
    @action
    setPendingFilter(fieldFilter) {
        this.op = fieldFilter?.op ?? '!=';
        this.inputVal = fieldFilter?.value ?? null;
    }

    //-------------------
    // Implementation
    //-------------------
    constructor(parentModel) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
        this.colId = parentModel.colId;
    }
}
