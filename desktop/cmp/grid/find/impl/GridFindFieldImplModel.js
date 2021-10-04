/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {
    escapeRegExp,
    filter,
    flatMap,
    get,
    intersection,
    isNil,
    isArray,
    isEmpty,
    isEqual,
    isFinite,
    without
} from 'lodash';

/**
 * @private
 */
export class GridFindFieldImplModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {string} */
    matchMode;
    /** @member {number} */
    queryBuffer;
    /** @member {string[]} */
    includeFields;
    /** @member {string[]} */
    excludeFields;

    @observable.ref results;

    get count() {
        return this.results?.length;
    }

    get selectedIdx() {
        if (!this.count) return null;
        const matchIdx = this.results.indexOf(this.gridModel.selectedId);
        return matchIdx > -1 ? matchIdx : null;
    }

    get countLabel() {
        if (isNil(this.results)) return null;
        const {count, selectedIdx} = this,
            match = isFinite(selectedIdx) ? selectedIdx + 1 : 0;
        return `${match}/${count}`;
    }

    @computed
    get hasQuery() {
        return !isNil(this.query) && this.query.length > 0;
    }

    @computed
    get hasResults() {
        return !isNil(this.results) && !isEmpty(this.results);
    }

    //------------------------------------------------------------------
    // Trampoline value to bindable -- from bound model, or grid
    //------------------------------------------------------------------
    get query() {
        const {bind, model, gridModel} = this;
        return bind ? model[bind] : gridModel.xhFindQuery;
    }

    @action
    setQuery(v) {
        const {bind, model, gridModel} = this;
        if (bind) {
            model.setBindable(bind, v);
        } else {
            gridModel.setXhFindQuery(v);
        }
    }

    constructor({
        gridModel,
        matchMode = 'startWord',
        queryBuffer = 200,
        includeFields,
        excludeFields
    }) {
        super();
        makeObservable(this);

        this.gridModel = gridModel;
        this.matchMode = matchMode;
        this.queryBuffer = queryBuffer;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;

        throwIf(!gridModel, "Must specify 'gridModel' in GridFindField.");

        this.addReaction({
            track: () => this.query,
            run: () => this.updateResults(true),
            debounce: queryBuffer
        });

        this.addReaction({
            track: () => [
                gridModel.store.records,
                gridModel.columns,
                gridModel.sortBy,
                gridModel.groupBy
            ],
            run: () => {
                this._records = null;
                if (this.hasQuery) this.updateResults();
            }
        });
    }

    // We allow these to be dynamically updated on every render.
    updateProps({includeFields, excludeFields}) {
        if (!isEqual([includeFields, excludeFields], [this.includeFields, this.excludeFields])) {
            this.includeFields = includeFields;
            this.excludeFields = excludeFields;
            this.updateResults();
        }
    }

    selectPrev() {
        const {hasResults, results, selectedIdx, gridModel} = this;
        if (!hasResults) return;
        const endIdx = results.length - 1;
        if (!isFinite(selectedIdx)) {
            gridModel.selectAsync(results[endIdx]);
            return;
        }

        const idx = (selectedIdx - 1) % results.length;
        gridModel.selectAsync(results[idx < 0 ? endIdx : idx]);
    }

    selectNext() {
        const {hasResults, results, selectedIdx, gridModel} = this;
        if (!hasResults) return;
        if (!isFinite(selectedIdx)) {
            gridModel.selectAsync(results[0]);
            return;
        }

        const idx = (selectedIdx + 1) % results.length;
        gridModel.selectAsync(results[idx]);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    updateResults(autoSelect) {
        // Track ids of matching records
        const {query, gridModel} = this,
            activeFields = this.getActiveFields();

        if (!query || isEmpty(activeFields)) {
            this.results = null;
            return;
        }

        const regex = this.getRegex(query),
            valGetters = flatMap(activeFields, (fieldPath) => this.getValGetters(fieldPath));

        this.results = this.getRecords().filter(rec => {
            return valGetters.some(fn => regex.test(fn(rec)));
        }).map(rec => rec.id);

        // Auto-select first matching result
        if (autoSelect && this.hasResults && !isFinite(this.selectedIdx)) {
            gridModel.selectAsync(this.results[0]);
        }
    }

    getRecords() {
        if (!this._records) {
            const records = this.sortRecordsRecursive([...this.gridModel.store.rootRecords]);
            this._records = this.sortRecordsByGroupBy(records);
        }
        return this._records;
    }

    // Sort records with GridModel's sortBy(s) using the Column's comparator
    sortRecordsRecursive(records) {
        const {gridModel} = this,
            {sortBy, treeMode, agApi} = gridModel,
            ret = [];

        [...sortBy].reverse().forEach(it => {
            const column = gridModel.getColumn(it.colId);
            if (!column) return;

            const {field, getValueFn} = column,
                compFn = column.getAgSpec().comparator.bind(column),
                direction = it.sort === 'desc' ? -1 : 1;

            records.sort((a, b) => {
                const valueA = getValueFn({record: a, field, column, gridModel}),
                    valueB = getValueFn({record: b, field, column, gridModel}),
                    nodeA = agApi?.getRowNode(a.id),
                    nodeB = agApi?.getRowNode(b.id);

                return compFn(valueA, valueB, nodeA, nodeB) * direction;
            });
        });

        records.forEach(rec => {
            ret.push(rec);
            if (treeMode && !isEmpty(rec.children)) {
                const children = this.sortRecordsRecursive(rec.children);
                ret.push(...children);
            }
        });

        return ret;
    }

    // Sort records with GridModel's groupBy(s) using the GridModel's groupSortFn
    sortRecordsByGroupBy(records) {
        const {gridModel} = this,
            {agApi, groupBy, groupSortFn} = gridModel;

        [...groupBy].reverse().forEach(groupField => {
            const column = gridModel.getColumn(groupField);
            if (!column) return;

            const {field, getValueFn} = column;
            records.sort((a, b) => {
                const valueA = getValueFn({record: a, field, column, gridModel}),
                    valueB = getValueFn({record: b, field, column, gridModel}),
                    nodeA = agApi?.getRowNode(a.id),
                    nodeB = agApi?.getRowNode(b.id);

                return groupSortFn(valueA, valueB, field, {gridModel, nodeA, nodeB});
            });
        });

        return records;
    }

    getRegex(searchTerm) {
        searchTerm = escapeRegExp(searchTerm);
        switch (this.matchMode) {
            case 'any':
                return new RegExp(searchTerm, 'i');
            case 'start':
                return new RegExp(`^${searchTerm}`, 'i');
            case 'startWord':
                return new RegExp(`(^|\\W)${searchTerm}`, 'i');
        }
        throw XH.exception('Unknown matchMode in GridFindField');
    }

    getActiveFields() {
        const {gridModel, includeFields, excludeFields} = this,
            groupBy = gridModel.groupBy,
            visibleCols = gridModel.getVisibleLeafColumns();

        let ret = ['id', ...gridModel.store.fields.map(f => f.name)];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, ...excludeFields);

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

        // Final filter for column visibility, or explicit request for inclusion.
        ret = ret.filter(f => {
            return (
                (includeFields && includeFields.includes(f)) ||
                visibleCols.find(c => c.field === f) ||
                groupBy.includes(f)
            );
        });

        return ret;
    }

    getValGetters(fieldName) {
        const {gridModel} = this,
            {store} = gridModel,
            field = store.getField(fieldName),
            {DATE, LOCAL_DATE} = FieldType;

        // See corresponding method in StoreFilterFieldImplModel for notes on this implementation.
        if (field?.type === DATE || field?.type === LOCAL_DATE) {
            const cols = filter(gridModel.getVisibleLeafColumns(), {field: fieldName});
            if (!cols) return [];

            return cols.map(column => {
                const {renderer, getValueFn} = column;
                return (record) => {
                    const ctx = {record, field, column, gridModel, store},
                        ret = getValueFn(ctx);

                    return renderer ? stripTags(renderer(ret, ctx)) : ret;
                };
            });
        }

        // Otherwise just match raw.
        // Use expensive get() only when needed to support dot-separated paths.
        return fieldName.includes('.') ? (rec) => get(rec.data, fieldName) : (rec) => rec.data[fieldName];
    }
}
