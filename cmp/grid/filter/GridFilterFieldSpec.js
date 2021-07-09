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

    /** @member {object} */
    inputProps;

    /**
     * @param {Object} c - GridFilterFieldSpec configuration.
     * @param {boolean} [c.enableEnumFilter] - true to provide the enumerated filter control
     *      within the filter affordance. Defaults to true for enumerable fieldTypes.
     * @param {object} [c.inputProps] - Props to pass through to the HoistInput components used on
     *      the custom filter tab. Note that the HoistInput component used is decided by fieldType.
     * @param {*} [c...rest] - arguments for BaseFieldSpec.
     */
    constructor({
        enableEnumFilter,
        inputProps,
        ...rest
    }) {
        super(rest);

        this.enableEnumFilter = enableEnumFilter ?? this.isEnumerable;
        this.inputProps = inputProps;
    }
}