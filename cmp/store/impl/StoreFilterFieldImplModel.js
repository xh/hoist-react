/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {start} from '@xh/hoist/promise';
import {FunctionFilter} from '@xh/hoist/data';
import {
    debounce,
    escapeRegExp,
    get,
    intersection,
    isArray,
    isEmpty,
    isEqual,
    without,
    isUndefined
} from 'lodash';

@HoistModel
export class StoreFilterFieldImplModel {

    model;
    bind;
    gridModel;
    store;

    testFn;
    filterBuffer;
    onFilterChange;
    includeFields;
    excludeFields;

    filter;
    bufferedApplyFilter;

    constructor({
        model,
        bind,
        gridModel,
        store,
        testFn,
        filterBuffer = 200,
        onFilterChange,
        includeFields,
        excludeFields
    }) {
        this.model = model;
        this.bind = bind;
        this.gridModel = gridModel;
        this.store = store;
        this.testFn = testFn;
        this.filterBuffer = filterBuffer;
        this.onFilterChange = onFilterChange;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;

        warnIf(!gridModel && !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op."
        );
        throwIf(!store && !bind, "Must specify either 'bind' or a 'store' in StoreFilterField.");

        this.bufferedApplyFilter = debounce(() => this.applyFilter(), filterBuffer);

        this.addReaction({
            track: () => [this.filterText, gridModel?.columns, gridModel?.groupBy],
            run: () => this.regenerateFilter(),
            fireImmediately: true
        });
    }

    // We allow these to be dynamic by updating on every render.
    updateFilterProps({
        onFilterChange,
        testFn,
        includeFields,
        excludeFields
    }) {
        // just record change to callback
        this.onFilterChange = onFilterChange;

        // ...other changes require re-generation
        if (!isEqual(
            [testFn, includeFields, excludeFields],
            [this.testFn, this.includeFields, this.excludeFields])
        ) {
            this.testFn = testFn;
            this.includeFields = includeFields;
            this.excludeFields = excludeFields;
            this.regenerateFilter();
        }
    }

    //------------------------------------------------------------------
    // Trampoline value to bindable -- from bound model, or store
    //------------------------------------------------------------------
    get filterText() {
        const {bind, model, store} = this;
        return bind ? model[bind] : store.xhFilterText;
    }

    @action
    setFilterText(v) {
        const {bind, model, store} = this;
        if (bind) {
            model.setBindable(bind, v);
        } else {
            store.setXhFilterText(v);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    applyFilter() {
        this.store?.filterModel.replaceFilters(this.filter);
    }

    regenerateFilter() {
        const {filter, filterText} = this,
            activeFields = this.getActiveFields(),
            supportDotSeparated = !!activeFields.find(it => it.includes('.')),
            searchTerm = escapeRegExp(filterText),
            initializing = isUndefined(filter);

        let {testFn} = this;
        if (!testFn && searchTerm && !isEmpty(activeFields)) {
            const regex = new RegExp(`(^|\\W)${searchTerm}`, 'i');
            testFn = (rec) => activeFields.some(f => {
                // Use of lodash get() slower than direct access - use only when needed to support
                // dot-separated field paths. (See note in getActiveFields() below.)
                const fieldVal = supportDotSeparated ? get(rec.data, f) : rec.data[f];
                return regex.test(fieldVal);
            });
        }

        const newFilter = testFn ? new FunctionFilter({id: this.xhId, testFn}) : null;
        if (!newFilter && this.filter) {
            this.store?.filterModel.removeFilters(this.filter);
        }
        this.filter = newFilter;
        if (!initializing && this.onFilterChange) this.onFilterChange(newFilter);

        // Only respect the buffer for non-null changes.  Allows immediate initialization and quick clearing
        if (!initializing && newFilter) {
            this.bufferedApplyFilter();
        } else {
            // start() here required to resolve a "Cannot update during an existing state transition"
            // React error. Further investigation required.
            start(() => this.applyFilter());
        }
    }

    getActiveFields() {
        let {gridModel, includeFields, excludeFields, store} = this;

        let ret = store ? ['id', ...store.fields.map(f => f.name)] : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, ...excludeFields);

        if (gridModel) {
            const groupBy = gridModel.groupBy,
                visibleCols = gridModel.getVisibleLeafColumns();

            // Push on dot-delimited grid column fields. These are supported by Grid and traverse
            // sub-objects in Record.data to display nested properties. Given that Grid treats these
            // as first-class fields and displays them w/o the need for renderers, we want to
            // include them here. (But only if their "root" is in the field list derived from the
            // Store and any given include/excludeField configs.)
            visibleCols.forEach(col => {
                const {fieldPath} = col;
                if (!isArray(fieldPath)) return;

                const rootFieldPath = fieldPath[0];
                if (ret.includes(rootFieldPath)) {
                    ret.push(col.field);
                }
            });

            // Run exclude once more to support explicitly excluding a dot-sep field added above.
            if (excludeFields) ret = without(ret, ...excludeFields);

            ret = ret.filter(f => {
                return (
                    (includeFields && includeFields.includes(f)) ||
                    visibleCols.find(c => c.field === f) ||
                    groupBy.includes(f)
                );
            });
        }
        return ret;
    }
}
