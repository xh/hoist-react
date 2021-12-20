/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BaseFilterFieldSpec} from '@xh/hoist/data/filter/BaseFilterFieldSpec';

/**
 * Apps should NOT instantiate this class directly. Instead {@see GridFilterModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class GridFilterFieldSpec extends BaseFilterFieldSpec {

    /** @member {boolean} */
    enableValues;

    /** @member {Column~rendererFn} */
    renderer;

    /** @member {object} */
    inputProps;

    /** @member {string} */
    defaultOp;

    /**
     * @param {Object} c - GridFilterFieldSpec configuration.
     * @param {boolean} [c.enableValues] - true to provide the value filter control
     *      within the filter affordance. Defaults to true for enumerable fieldTypes.
     * @param {Column~rendererFn} [c.renderer] - function returning a formatted string for each
     *      value in this values filter display. If not provided, the Column's renderer will be used.
     * @param {object} [c.inputProps] - Props to pass through to the HoistInput components used on
     *      the custom filter tab. Note that the HoistInput component used is decided by fieldType.
     * @param {string} [c.defaultOp] - Default operator displayed in custom filter tab.
     * @param {*} [c...rest] - arguments for BaseFilterFieldSpec.
     */
    constructor({
        enableValues,
        renderer,
        inputProps,
        defaultOp,
        ...rest
    }) {
        super(rest);

        this.enableValues = enableValues ?? this.isEnumerableByDefault;
        this.renderer = renderer;
        this.inputProps = inputProps;
        this.defaultOp = this.ops.includes(defaultOp) ? defaultOp : this.ops[0];
    }
}