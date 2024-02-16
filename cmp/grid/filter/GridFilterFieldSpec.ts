/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer} from '@xh/hoist/cmp/grid';
import {
    DesktopDateInputProps,
    DesktopNumberInputProps,
    DesktopSelectProps,
    DesktopTextInputProps
} from '@xh/hoist/cmp/input';
import {PlainObject} from '@xh/hoist/core';
import {FieldFilterOperator, parseFilter, View} from '@xh/hoist/data';
import {
    BaseFilterFieldSpec,
    BaseFilterFieldSpecConfig
} from '@xh/hoist/data/filter/BaseFilterFieldSpec';
import {castArray, compact, flatten, isDate, isEmpty, uniqBy} from 'lodash';
import {MergeExclusive} from 'type-fest';
import {GridFilterModel} from './GridFilterModel';

export interface GridFilterFieldSpecConfig extends BaseFilterFieldSpecConfig {
    /** GridFilterModel instance owning this fieldSpec. */
    filterModel?: GridFilterModel;

    /**
     * Function returning a formatted string for each value in this values filter display.
     * If not provided, the Column's renderer will be used.
     */
    renderer?: ColumnRenderer;

    /**
     * Props to pass through to the HoistInput components used on the custom filter tab.
     * Note that the HoistInput component used is decided by fieldType.
     */
    inputProps?: MergeExclusive<
        DesktopNumberInputProps,
        MergeExclusive<
            DesktopDateInputProps,
            MergeExclusive<DesktopSelectProps, DesktopTextInputProps>
        >
    >;

    /** Default operator displayed in custom filter tab. */
    defaultOp?: FieldFilterOperator;
}

/**
 * Apps should NOT instantiate this class directly.
 * Instead, provide a config for this object to the GridModel's `filterModel` config.
 */
export class GridFilterFieldSpec extends BaseFilterFieldSpec {
    filterModel: GridFilterModel;
    renderer: ColumnRenderer;
    inputProps: PlainObject;
    defaultOp: FieldFilterOperator;
    valueCount: number;

    constructor({
        filterModel,
        renderer,
        inputProps,
        defaultOp,
        ...rest
    }: GridFilterFieldSpecConfig) {
        super(rest);

        this.filterModel = filterModel;
        this.renderer = renderer;
        this.inputProps = inputProps;
        this.defaultOp = this.ops.includes(defaultOp) ? defaultOp : this.ops[0];
    }

    //------------------------
    // Implementation
    //------------------------
    loadValuesFromSource() {
        const {filterModel, field, source, sourceField} = this,
            columnFilters = filterModel.getColumnFilters(field),
            sourceStore = source instanceof View ? source.cube.store : source,
            allRecords = sourceStore.allRecords;

        // Apply external filters *not* pertaining to this field to the sourceStore
        // to get the filtered set of available values to offer as options.
        const cleanedFilter = this.cleanFilter(filterModel.filter);
        let filteredRecords = allRecords;
        if (cleanedFilter) {
            const testFn = parseFilter(cleanedFilter).getTestFn(sourceStore);
            filteredRecords = allRecords.filter(testFn);
        }

        // Get values from current column filter
        const filterValues = [];
        columnFilters.forEach(filter => {
            const newValues = castArray(filter.value).map(value => {
                value = sourceField.parseVal(value);
                return filterModel.toDisplayValue(value);
            });
            filterValues.push(...newValues);
        });

        // Combine unique values from record sets and column filters.
        const allValues = uniqBy(
            [...flatten(allRecords.map(rec => this.valueFromRecord(rec))), ...filterValues],
            this.getUniqueValue
        );
        let values;
        if (cleanedFilter) {
            values = uniqBy(
                [
                    ...flatten(filteredRecords.map(rec => this.valueFromRecord(rec))),
                    ...filterValues
                ],
                this.getUniqueValue
            );
        } else {
            values = allValues;
        }

        this.values = values.sort();
        this.valueCount = allValues.length;
    }

    // Recursively modify a Filter|CompoundFilter to remove all FieldFilters referencing this column
    cleanFilter(filter) {
        if (!filter) return filter;

        const {field, filters, op} = filter;
        if (filters) {
            const ret = compact(filters.map(it => this.cleanFilter(it)));
            return !isEmpty(ret) ? {op, filters: ret} : null;
        } else if (field === this.field) {
            return null;
        }

        return filter;
    }

    valueFromRecord(record) {
        const {filterModel, field} = this;
        return filterModel.toDisplayValue(record.get(field));
    }

    getUniqueValue(value) {
        // Return ms timestamp for dates to facilitate uniqueness check
        return isDate(value) ? value.getTime() : value;
    }
}
