/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FilterFieldSpec, FilterFieldSpecConfig} from '@xh/hoist/data/filter/FilterFieldSpec';
import {FieldFilterOperator} from '@xh/hoist/data/filter/Types';

export interface FilterBuilderFieldSpecConfig extends FilterFieldSpecConfig {
    /** Pre-selected operator for new rules on this field. Defaults to first available. */
    defaultOperator?: FieldFilterOperator;
}

/**
 * Filter field specification class for the FilterBuilder component. Extends the base
 * FilterFieldSpec with builder-specific configuration.
 *
 * Apps should NOT instantiate this class directly. Instead see {@link FilterBuilderModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class FilterBuilderFieldSpec extends FilterFieldSpec {
    defaultOperator: FieldFilterOperator;

    /** @internal */
    constructor({defaultOperator, ...rest}: FilterBuilderFieldSpecConfig) {
        super(rest);

        this.defaultOperator = this.ops.includes(defaultOperator) ? defaultOperator : this.ops[0];

        if (!this.hasExplicitValues && this.source && this.sourceField && this.enableValues) {
            this.addReaction({
                track: () => this.source.lastUpdated,
                run: () => this.loadValues(),
                debounce: 100,
                fireImmediately: true
            });
        }
    }

    loadValuesFromSource() {
        this.values = this.source.getValuesForFieldFilter(this.field);
    }
}
