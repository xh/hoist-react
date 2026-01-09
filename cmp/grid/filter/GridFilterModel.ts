/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {GridFilterFieldSpec, GridFilterModelConfig} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {
    CompoundFilter,
    FieldFilter,
    Filter,
    FilterLike,
    flattenFilter,
    Store,
    View,
    withFilterByField,
    withFilterByTypes
} from '@xh/hoist/data';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {castArray, compact, every, find, isNil, isString, uniq} from 'lodash';
import {GridModel} from '../GridModel';

/**
 * Model for managing a Grid's column filters.
 * @internal
 */
export class GridFilterModel extends HoistModel {
    override xhImpl = true;

    gridModel: GridModel;
    bind: Store | View;
    @bindable commitOnChange: boolean;
    @managed fieldSpecs: GridFilterFieldSpec[] = [];

    get filter(): Filter {
        return this.bind.filter;
    }

    // Open state for filter dialog
    @observable dialogOpen = false;

    // Display for nil or empty values
    static BLANK_PLACEHOLDER = '[blank]';

    constructor(
        {bind, commitOnChange = false, fieldSpecs, fieldSpecDefaults}: GridFilterModelConfig,
        gridModel: GridModel
    ) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.bind = bind;
        this.commitOnChange = commitOnChange;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
    }

    /**
     * Set / replace the filters for a given field.
     * @param field - field to identify this filter
     * @param filter - Filter to apply. If null, the filter will be removed
     */
    @action
    setColumnFilters(field: string, filter: FilterLike) {
        // If current bound filter is a CompoundFilter for a single column, wrap it
        // in an 'AND' CompoundFilter so new columns get 'ANDed' alongside it.
        let currFilter = this.filter as any;
        if (currFilter instanceof CompoundFilter && currFilter.field) {
            currFilter = {filters: [currFilter], op: 'AND'};
        }

        const ret = withFilterByField(currFilter, filter, field);
        this.setFilter(ret);
    }

    /**
     * Appends the value of a new filter into the existing filter on the same field and operator.
     * If such no filter exists, one will be created. Only applicable for filters with multi-value operators.
     * @param field - field to identify this filter
     * @param filter - Filter to apply. If null, the filter will be removed
     */
    @action
    mergeColumnFilters(field: string, filter: FilterLike) {
        let newFilter: any = filter;
        const {op} = newFilter;
        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            const currFilters = flattenFilter(this.filter),
                match = find(currFilters, {field, op}) as any;

            if (match) {
                newFilter.value = uniq([...castArray(newFilter.value), ...castArray(match.value)]);
            }
        }
        this.setColumnFilters(field, filter);
    }

    @action
    clear() {
        const ret = withFilterByTypes(this.filter, null, ['FieldFilter', 'CompoundFilter']);
        this.setFilter(ret);
    }

    getColumnFilters(field: string): FieldFilter[] {
        return flattenFilter(this.filter).filter(
            it => it instanceof FieldFilter && it.field === field
        ) as FieldFilter[];
    }

    /** The CompoundFilter that wraps the filters for specified field. */
    getColumnCompoundFilter(field: string): CompoundFilter {
        return this.getOuterCompoundFilter(this.filter, field);
    }

    getFieldSpec(field: string): GridFilterFieldSpec {
        return this.fieldSpecs.find(it => it.field === field);
    }

    toDisplayValue(value: any): any {
        return isNil(value) || value === '' ? GridFilterModel.BLANK_PLACEHOLDER : value;
    }

    fromDisplayValue(value: any): any {
        return value === GridFilterModel.BLANK_PLACEHOLDER ? null : value;
    }

    @action
    openDialog() {
        this.dialogOpen = true;
    }

    @action
    closeDialog() {
        this.dialogOpen = false;
    }

    setFilter(filter: Filter) {
        wait()
            .then(() => this.bind.setFilter(filter))
            .linkTo(this.gridModel.filterTask);
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    private parseFieldSpecs(specs, fieldSpecDefaults) {
        const {bind} = this;

        // If no specs provided, include all source fields.
        if (!specs) specs = bind.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new GridFilterFieldSpec({
                filterModel: this,
                source: bind,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }

    private getOuterCompoundFilter(filter: Filter, field: string) {
        if (!CompoundFilter.isCompoundFilter(filter)) return null;

        // This is the outer compound filter if all children are FieldFilters on the matching field.
        if (every(filter.filters, {field})) {
            return filter;
        }

        // Otherwise, check any CompoundFilter children
        const results = compact(filter.filters.map(it => this.getOuterCompoundFilter(it, field)));
        return results.length === 1 ? results[0] : null;
    }
}
