/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Column, GridLikeModel, GridModel} from '@xh/hoist/cmp/grid';
import {CellTextCache, getMatchTextGetters} from '@xh/hoist/cmp/grid/impl/FindUtils';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {DataViewModel} from '@xh/hoist/cmp/dataview';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {HoistModel, lookup} from '@xh/hoist/core';
import type {FilterMatchMode, FilterMatchOn, StoreRecord, Store} from '@xh/hoist/data';
import {appendFilter, getFilterRegex} from '@xh/hoist/data';
import {action, compareStructural, computed} from '@xh/hoist/mobx';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {
    debounce,
    filter,
    flatMap,
    intersection,
    isArray,
    isEmpty,
    isUndefined,
    without
} from 'lodash';

/**
 * @internal
 */
export class StoreFilterFieldImplModel extends HoistModel {
    override xhImpl = true;

    @lookup('*') model;

    private filter: (rec: StoreRecord) => boolean;
    private bufferedApplyFilter;

    // Text shown by cells, kept between filters.
    private textCache = new CellTextCache();

    get matchMode(): FilterMatchMode {
        return this.componentProps.matchMode ?? 'startWord';
    }

    get matchOn(): FilterMatchOn {
        return this.componentProps.matchOn ?? 'value';
    }

    /** Model to filter - from props, or the nearest found in context. */
    @computed
    get boundModel(): GridLikeModel {
        const {gridModel, store} = this.componentProps;
        if (store) return null;
        return gridModel ?? this.lookupModel(isGridLikeModel);
    }

    @computed
    get store(): Store {
        return this.componentProps.store ?? this.boundModel?.store ?? null;
    }

    override onLinked() {
        const {componentProps, store} = this,
            {bind, includeFields, filterBuffer = 200} = componentProps;
        throwIf(
            componentProps.gridModel && componentProps.store,
            "Cannot specify both 'gridModel' and 'store' props."
        );
        warnIf(
            !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op."
        );
        throwIf(!store && !bind, "Must specify either 'bind' or a 'store' in StoreFilterField.");

        this.bufferedApplyFilter = debounce(() => this.applyFilter(), filterBuffer);

        this.addReaction(
            {
                track: () => [this.store, this.filterText, ...this.getSearchColumns()],
                run: () => this.regenerateFilter(),
                equals: 'shallow',
                fireImmediately: true
            },
            {
                track: () => {
                    const {includeFields, excludeFields} = this.componentProps;
                    return [includeFields, excludeFields, this.matchMode, this.matchOn];
                },
                run: () => this.regenerateFilter(),
                equals: compareStructural
            }
        );
    }

    //------------------------------------------------------------------
    // Trampoline value to bindable -- from bound model, or store
    //------------------------------------------------------------------
    get filterText(): string {
        const {bind, model} = this.componentProps;
        return bind ? model[bind] : this.store.xhFilterText;
    }

    @action
    setFilterText(v: string) {
        const {bind, model} = this.componentProps;
        if (bind) {
            model.setBindable(bind, v);
        } else {
            this.store.setXhFilterText(v);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    applyFilter() {
        const {store} = this;
        if (!store) return;

        const key = 'default',
            testFn = this.filter,
            filter = testFn ? {key, testFn} : null;

        const ret = appendFilter(store.filter?.removeFunctionFilters(key), filter);
        store.setFilter(ret);
    }

    regenerateFilter() {
        const {filter, filterText} = this,
            {autoApply = true, onFilterChange} = this.componentProps,
            activeFields = this.getActiveFields(),
            initializing = isUndefined(filter);

        let newFilter = null;
        if (filterText && !isEmpty(activeFields)) {
            const regex = getFilterRegex(filterText, this.matchMode),
                valGetters = flatMap(activeFields, fieldPath => this.getValGetters(fieldPath));
            newFilter = (rec: StoreRecord) => valGetters.some(fn => regex.test(fn(rec)));
        }

        if (filter === newFilter) return;

        this.filter = newFilter;
        if (!initializing && onFilterChange) onFilterChange(newFilter);

        if (autoApply) {
            // Only respect the buffer for non-null changes. Allows immediate initialization and quick clearing.
            if (!initializing && newFilter) {
                this.bufferedApplyFilter();
            } else {
                this.applyFilter();
            }
        }
    }

    getActiveFields(): string[] {
        const {boundModel, store, componentProps} = this,
            {includeFields, excludeFields} = componentProps;

        let ret = store ? ['id', ...store.fieldNames] : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, ...excludeFields);

        if (boundModel) {
            const searchCols = this.getSearchColumns();

            // Push on dot-delimited grid column fields. These are supported by Grid and traverse
            // sub-objects in StoreRecord.data to display nested properties. Given that Grid treats these
            // as first-class fields and displays them w/o the need for renderers, we want to
            // include them here. (But only if their "root" is in the field list derived from the
            // Store and any given include/excludeField configs.)
            searchCols.forEach(col => {
                const {fieldPath} = col;
                if (!isArray(fieldPath)) return;

                const rootFieldPath = fieldPath[0];
                if (ret.includes(rootFieldPath)) {
                    ret.push(col.field);
                }
            });

            // Run exclude once more to support explicitly excluding a dot-sep field added above.
            if (excludeFields) ret = without(ret, ...excludeFields);

            // Final filter for column visibility, or explicit request for inclusion. Deliberately
            // not keyed to groupBy, so filter results stay stable across regrouping (see #4070).
            ret = ret.filter(f => {
                return (
                    (includeFields && includeFields.includes(f)) ||
                    searchCols.find(c => c.field === f)
                );
            });
        }

        return ret;
    }

    getValGetters(fieldName: string) {
        const {boundModel, store} = this,
            columns = boundModel ? filter(this.getSearchColumns(), {field: fieldName}) : null;
        return getMatchTextGetters(fieldName, store, columns, this.matchOn, this.textCache);
    }

    private get innerGridModel(): GridModel {
        return this.boundModel?.innerGridModel ?? null;
    }

    /**
     * Columns whose fields the user can see, and so should be able to search. A ZoneGrid renders
     * its mapped fields within two zone columns, so use the columns backing those fields instead.
     * A DataView renders every field through one item renderer, so search them all.
     */
    private getSearchColumns(): Column[] {
        const {boundModel, innerGridModel} = this;
        if (!boundModel) return [];
        if (boundModel instanceof ZoneGridModel) return boundModel.getMappedColumns();
        if (boundModel instanceof DataViewModel) {
            return innerGridModel.getLeafColumns().filter(it => it.field);
        }
        return innerGridModel.getVisibleLeafColumns();
    }
}
