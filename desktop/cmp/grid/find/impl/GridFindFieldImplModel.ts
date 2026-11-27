/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {getMatchTextGetters} from '@xh/hoist/cmp/grid/impl/FindUtils';
import type {FilterMatchMode, StoreRecord} from '@xh/hoist/data';
import {getFilterRegex} from '@xh/hoist/data';
import {action, computed, observableRef, compareStructural} from '@xh/hoist/mobx';
import {filter, flatMap, isEmpty, isFinite, isNil} from 'lodash';
import {BaseGridFindImplModel} from './BaseGridFindImplModel';

/**
 * Impl model for `GridFindField` in `rows` mode - finds matching records and selects them.
 * @internal
 */
export class GridFindFieldImplModel extends BaseGridFindImplModel {
    get matchMode(): FilterMatchMode {
        return this.componentProps.matchMode ?? 'startWord';
    }

    @observableRef accessor results;
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

    @computed
    get hasResults(): boolean {
        return !isNil(this.results) && !isEmpty(this.results);
    }

    //------------------------------------------------------------------
    // Trampoline value to grid
    //------------------------------------------------------------------
    override onLinked() {
        super.onLinked();
        const {boundModel, innerGridModel} = this;
        if (!boundModel) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        } else if (!innerGridModel.selModel?.isEnabled) {
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
                track: () => [this.includeFields, this.excludeFields, this.matchMode, this.matchOn],
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
            {store} = innerGridModel,
            searchCols = this.getSearchColumns(),
            valGetters = flatMap(activeFields, field =>
                getMatchTextGetters(
                    field,
                    store,
                    filter(searchCols, {field}),
                    this.matchOn,
                    this.textCache
                )
            );

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
}
