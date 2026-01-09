/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer} from '@xh/hoist/cmp/grid';
import {HoistInputProps} from '@xh/hoist/cmp/input';
import {PlainObject} from '@xh/hoist/core';
import {
    CompoundFilter,
    FieldFilter,
    FieldFilterOperator,
    Filter,
    parseFilter
} from '@xh/hoist/data';
import {
    BaseFilterFieldSpec,
    BaseFilterFieldSpecConfig
} from '@xh/hoist/data/filter/BaseFilterFieldSpec';
import {castArray, compact, flatMap, isDate, isEmpty, uniqBy} from 'lodash';
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
    inputProps?: HoistInputProps;

    /** Default operator displayed in custom filter tab. */
    defaultOp?: FieldFilterOperator;
}

/**
 * Apps should NOT instantiate this class directly.
 * Instead, provide a config for this object via {@link GridConfig.filterModel} config.
 */
export class GridFilterFieldSpec extends BaseFilterFieldSpec {
    filterModel: GridFilterModel;
    renderer: ColumnRenderer;
    inputProps: PlainObject;
    defaultOp: FieldFilterOperator;

    /** Total number of unique values for this field in the source, regardless of other filters. */
    allValuesCount: number;

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

    getUniqueValue(value: unknown) {
        // Return ms timestamp for dates to facilitate uniqueness check
        return isDate(value) ? value.getTime() : value;
    }

    //------------------------
    // Implementation
    //------------------------
    loadValuesFromSource() {
        const {filterModel, field, source, sourceField} = this,
            columnFilters = filterModel.getColumnFilters(field);

        // All possible values for this field from our source.
        const allSrcVals = source.getValuesForFieldFilter(field).map(it => this.toDisplayValue(it));

        // Values from current column filter.
        const colFilterVals = flatMap(columnFilters, filter => {
            return castArray(filter.value).map(val => sourceField.parseVal(val));
        }).map(it => this.toDisplayValue(it));

        // Combine + unique - these are all values that *could* be shown in the filter UI.
        const allValues = uniqBy([...allSrcVals, ...colFilterVals], this.getUniqueValue);

        // Create a filter with other filters *not* pertaining to this field, if any.
        // This filter will be used to get the subset of all possible values for this field that
        // exist in records passing those other filters.
        const otherFieldsFilter = this.cleanFilter(filterModel.filter);

        let values: any[];

        if (otherFieldsFilter) {
            // If we have filters on other fields, get values from source that pass that filter.
            // These will be the set of values shown in the filter UI.
            const filteredSrcVals = source
                .getValuesForFieldFilter(field, otherFieldsFilter)
                .map(it => this.toDisplayValue(it));
            values = uniqBy([...filteredSrcVals, ...colFilterVals], this.getUniqueValue);
        } else {
            // Otherwise, all possible values are shown.
            values = allValues;
        }

        this.values = values.sort();

        // Note count of all possible values for this field - allows ValuesTabModel
        // to indicate to the user if some values are hidden due to other active filters.
        this.allValuesCount = allValues.length;
    }

    // Recursively modify a Filter|CompoundFilter to remove all FieldFilters referencing this column
    private cleanFilter(filter: Filter): Filter {
        if (CompoundFilter.isCompoundFilter(filter)) {
            const {filters, op} = filter;
            const ret = compact(filters.map(it => this.cleanFilter(it)));
            return !isEmpty(ret) ? parseFilter({op, filters: ret}) : null;
        }

        if (FieldFilter.isFieldFilter(filter) && filter.field === this.field) {
            return null;
        }

        return filter;
    }

    private toDisplayValue(val: any): any {
        return this.filterModel.toDisplayValue(val);
    }
}
