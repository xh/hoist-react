/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {HoistModel} from '@xh/hoist/core';
import type {FilterMatchMode, StoreRecord} from '@xh/hoist/data';
import {getFilterRegex} from '@xh/hoist/data';
import {TextInputModel} from '@xh/hoist/desktop/cmp/input';
import {action, bindable, computed, observableRef, compareStructural} from '@xh/hoist/mobx';
import {stripTags} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    filter,
    flatMap,
    get,
    intersection,
    isArray,
    isEmpty,
    isFinite,
    isNil,
    without
} from 'lodash';

/**
 * @internal
 */
export class GridFindFieldImplModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor query: string = null;

    get matchMode(): FilterMatchMode {
        return this.componentProps.matchMode ?? 'startWord';
    }

    get queryBuffer(): number {
        return this.componentProps.queryBuffer ?? 200;
    }

    get includeFields(): string[] {
        return this.componentProps.includeFields;
    }

    get excludeFields(): string[] {
        return this.componentProps.excludeFields;
    }

    @observableRef accessor results;
    inputRef = createObservableRef<TextInputModel>();
    _records: StoreRecord[] = null;

    get count(): number {
        return this.results?.length;
    }

    get selectedIdx(): number {
        if (!this.count) return null;
        const matchIdx = this.results.indexOf(this.innerGridModel.selectedId);
        return matchIdx > -1 ? matchIdx : null;
    }

    get countLabel(): string {
        if (isNil(this.results)) return null;
        const {count, selectedIdx} = this,
            match = isFinite(selectedIdx) ? selectedIdx + 1 : 0;
        return `${match}/${count}`;
    }

    get hasFocus() {
        return this.inputRef?.current?.hasFocus;
    }

    @computed
    get hasQuery(): boolean {
        return !isNil(this.query) && this.query.length > 0;
    }

    @computed
    get hasResults(): boolean {
        return !isNil(this.results) && !isEmpty(this.results);
    }

    /** GridModel or ZoneGridModel to search - from props, or the nearest found in context. */
    @computed
    get boundModel(): GridModel | ZoneGridModel {
        return (
            this.componentProps.gridModel ??
            this.lookupModel(it => it instanceof GridModel || it instanceof ZoneGridModel)
        );
    }

    //------------------------------------------------------------------
    // Trampoline value to grid
    //------------------------------------------------------------------
    override onLinked() {
        const {boundModel} = this;
        if (!boundModel) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        } else if (!boundModel.selModel?.isEnabled) {
            this.logError('GridFindField must be bound to GridModel with selection enabled.');
        }

        this.addReaction(
            {
                track: () => this.query,
                run: () => this.updateResults(true),
                debounce: this.queryBuffer
            },
            {
                track: () => {
                    const {innerGridModel} = this;
                    return [
                        innerGridModel?.store.records,
                        innerGridModel?.sortBy,
                        innerGridModel?.groupBy,
                        ...this.getSearchColumns()
                    ];
                },
                run: () => {
                    this._records = null;
                    if (this.hasQuery) this.updateResults();
                },
                equals: 'shallow',
                debounce: this.queryBuffer
            },
            {
                track: () => [this.includeFields, this.excludeFields, this.matchMode],
                run: () => this.updateResults(),
                equals: compareStructural
            }
        );
    }

    selectPrev() {
        const {hasResults, results, selectedIdx, innerGridModel} = this;
        if (!hasResults) return;
        const endIdx = results.length - 1;
        if (!isFinite(selectedIdx)) {
            innerGridModel.selectAsync(results[endIdx]);
            return;
        }

        const idx = (selectedIdx - 1) % results.length;
        innerGridModel.selectAsync(results[idx < 0 ? endIdx : idx]);
    }

    selectNext() {
        const {hasResults, results, selectedIdx, innerGridModel} = this;
        if (!hasResults) return;
        if (!isFinite(selectedIdx)) {
            innerGridModel.selectAsync(results[0]);
            return;
        }

        const idx = (selectedIdx + 1) % results.length;
        innerGridModel.selectAsync(results[idx]);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private updateResults(autoSelect = false) {
        // Track ids of matching records
        const {query, innerGridModel} = this,
            activeFields = this.getActiveFields();

        if (!query || isEmpty(activeFields)) {
            this.results = null;
            return;
        }

        const regex = getFilterRegex(query, this.matchMode),
            valGetters = flatMap(activeFields, fieldPath => this.getValGetters(fieldPath));

        this.results = this.getRecords()
            .filter(rec => {
                return valGetters.some(fn => regex.test(fn(rec)));
            })
            .map(rec => rec.id);

        // Auto-select first matching result
        if (autoSelect && this.hasResults && !isFinite(this.selectedIdx)) {
            innerGridModel?.selectAsync(this.results[0]);
        }
    }

    private getRecords(): StoreRecord[] {
        return (this._records ??= this.innerGridModel.getSortedRecords());
    }

    private getActiveFields(): string[] {
        const {innerGridModel, includeFields, excludeFields} = this,
            searchCols = this.getSearchColumns();

        let ret = ['id', ...innerGridModel.store.fieldNames];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, ...excludeFields);

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

        // Final filter for column visibility, or explicit request for inclusion. Deliberately not
        // keyed to groupBy, so query results stay stable across regrouping (see #4070).
        ret = ret.filter(f => {
            return (
                (includeFields && includeFields.includes(f)) || searchCols.find(c => c.field === f)
            );
        });

        return ret;
    }

    private getValGetters(fieldName: string) {
        const {innerGridModel} = this,
            {store} = innerGridModel,
            field = store.getField(fieldName);

        // See corresponding method in StoreFilterFieldImplModel for notes on this implementation.
        if (field?.type === 'date' || field?.type === 'localDate') {
            const cols = filter(this.getSearchColumns(), {field: fieldName});
            if (!cols) return [];

            return cols.map(column => {
                const {renderer, getValueFn} = column;
                return (record: StoreRecord) => {
                    const ctx = {
                            record,
                            field: fieldName,
                            column,
                            gridModel: innerGridModel,
                            store,
                            agParams: null
                        },
                        ret = getValueFn(ctx);

                    return renderer ? stripTags(renderer(ret, ctx)) : ret;
                };
            });
        }

        // Otherwise just match raw.
        // Use expensive get() only when needed to support dot-separated paths.
        return fieldName.includes('.')
            ? (rec: StoreRecord) => get(rec.data, fieldName)
            : (rec: StoreRecord) => rec.data[fieldName];
    }

    private get innerGridModel(): GridModel {
        const {boundModel} = this;
        return boundModel instanceof ZoneGridModel ? boundModel.gridModel : boundModel;
    }

    // See corresponding method in StoreFilterFieldImplModel.
    private getSearchColumns(): Column[] {
        const {boundModel} = this;
        if (!boundModel) return [];
        return boundModel instanceof ZoneGridModel
            ? boundModel.getMappedColumns()
            : boundModel.getVisibleLeafColumns();
    }
}
