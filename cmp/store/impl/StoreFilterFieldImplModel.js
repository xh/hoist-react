/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {
    debounce,
    escapeRegExp,
    get,
    intersection,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    upperFirst,
    without
} from 'lodash';

@HoistModel
export class StoreFilterFieldImplModel {

    gridModel;
    store;
    filterBuffer;
    filterOptions;
    onFilterChange;
    includeFields;
    excludeFields;
    model;
    bind;

    @observable value = '';

    filter = null;
    applyFilterFn = null;

    constructor({
        gridModel,
        store,
        filterBuffer = 200,
        filterOptions,
        onFilterChange,
        includeFields,
        excludeFields,
        model,
        bind
    }) {
        this.gridModel = gridModel;
        this.store = store;
        this.filterBuffer = filterBuffer;
        this.filterOptions = filterOptions;
        this.onFilterChange = onFilterChange;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;
        this.model = model;
        this.bind = bind;

        warnIf(includeFields && excludeFields,
            "Cannot specify both 'includeFields' and 'excludeFields' props."
        );
        warnIf(!gridModel && !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op"
        );

        if (store) {
            this.applyFilterFn = debounce(
                () => this.applyStoreFilter(),
                filterBuffer
            );

            if (gridModel) {
                this.addReaction({
                    track: () => [gridModel.columns, gridModel.groupBy, filterOptions],
                    run: () => this.regenerateFilter({applyImmediately: false})
                });
            }
        }

        if (model && bind) {
            this.addReaction({
                track: () => model[bind],
                run: (boundVal) => this.setValue(boundVal),
                fireImmediately: true
            });
        }
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    setValue(v, {applyImmediately} = {}) {
        if (isEqual(v, this.value)) return;

        this.value = v;
        this.regenerateFilter({applyImmediately});

        const {bind, model} = this;
        if (bind && model) {
            const setterName = `set${upperFirst(bind)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](v);
        }
    }

    regenerateFilter({applyImmediately}) {
        const {applyFilterFn, onFilterChange, filterOptions} = this,
            activeFields = this.getActiveFields(),
            supportDotSeparated = !!activeFields.find(it => it.includes('.')),
            searchTerm = escapeRegExp(this.value);

        let fn = null;
        if (searchTerm && !isEmpty(activeFields)) {
            const regex = new RegExp(`(^|\\W)${searchTerm}`, 'i');
            fn = (rec) => activeFields.some(f => {
                // Use of lodash get() slower than direct access - use only when needed to support
                // dot-separated field paths. (See note in getActiveFields() below.)
                const fieldVal = supportDotSeparated ? get(rec.data, f) : rec.data[f];
                return regex.test(fieldVal);
            });
        }
        this.filter = fn ? {...filterOptions, fn} : null;

        if (onFilterChange) onFilterChange(this.filter);

        if (applyFilterFn) {
            if (applyImmediately) {
                applyFilterFn.cancel();
                this.applyStoreFilter();
            } else {
                applyFilterFn();
            }
        }
    }

    applyStoreFilter() {
        if (this.store) {
            this.store.setFilter(this.filter);
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
                    visibleCols.find(c => c.field == f) ||
                    groupBy.includes(f)
                );
            });
        }
        return ret;
    }
}
