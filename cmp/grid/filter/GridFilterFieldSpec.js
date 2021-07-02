/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BaseFieldSpec} from '@xh/hoist/data/filter/BaseFieldSpec';

/**
 * Apps should NOT instantiate this class directly. Instead {@see GridFilterModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class GridFilterFieldSpec extends BaseFieldSpec {

    /** @member {boolean} */
    enableEnumFilter;

    /**
     * @param {Object} c - GridFilterFieldSpec configuration.
     * @param {boolean} [c.enableEnumFilter] - true to provide the enumerated
     *      filter control within the filter affordance. Defaults to true for fieldTypes of
     *      'string' or 'auto', otherwise false.
     * @param {*} [c...rest] - arguments for BaseFieldSpec.
     */
    constructor({
        enableEnumFilter,
        ...rest
    }) {
        super(rest);

        this.enableEnumFilter = enableEnumFilter ?? this.isValueType;
    }
}