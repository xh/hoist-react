/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * Todo
 */
@HoistModel
export class TreeMapModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {string} */
    labelField;
    /** @member {string} */
    valueField;
    /** @member {string} */
    heatField;
    /** @member {string} */
    valueFieldLabel;
    /** @member {string} */
    heatFieldLabel;
    /** @member {string} */
    algorithm;
    /** @member {(boolean|TreeMapModel~tooltipFn)} */
    tooltip;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref config = {};
    /** @member {TreeMapRecord[]} */
    @observable.ref data = [];

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.config - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {Object[]} c.data - Raw data to be displayed.
     * @param {string} c.labelField - Record field to use to determine node label.
     * @param {string} c.valueField - Record field to use to determine node size.
     * @param {string} c.heatField - Record field to use to determine node color.
     * @param {string} [c.valueFieldLabel] - Label for valueField to render in the default tooltip.
     * @param {string} [c.heatFieldLabel] - Label for heatField to render in the default tooltip.
     * @param {string} [c.algorithm] - Layout algorithm to use. Either 'sliceAndDice', 'stripes', 'squarified' or 'strip'.
     * @param {(boolean|TreeMapModel~tooltipFn)} [c.tooltip] - 'true' to use the default tooltip renderer, or a custom
     *      tooltipFn which returns a string output of the node's value.
     */
    constructor({
        config,
        data = [],
        labelField = 'name',
        valueField = 'value',
        heatField = 'value',
        valueFieldLabel,
        heatFieldLabel,
        algorithm = 'squarified',
        tooltip = true
    } = {}) {
        this.config = config;
        this.data = data;

        this.labelField = labelField;
        this.valueField = valueField;
        this.heatField = heatField;
        this.valueFieldLabel = valueFieldLabel;
        this.heatFieldLabel = heatFieldLabel;
        this.tooltip = tooltip;

        if (!['sliceAndDice', 'stripes', 'squarified', 'strip'].includes(algorithm)) {
            console.warn(`Algorithm ${algorithm} not recognised. Defaulting to 'squarified'.`);
            algorithm = 'squarified';
        }
        this.algorithm = algorithm;
    }

    @action
    setData(data) {
        this.data = this.processDataRecursive(data);
    }

    //-------------------------
    // Implementation
    //-------------------------
    processDataRecursive(rawData, parentId = null, ret = []) {
        const {labelField, valueField, heatField} = this;

        rawData.forEach(record => {
            const {id, children} = record,
                name = record[labelField],
                value = record[valueField],
                colorValue = record[heatField];

            throwIf(isNil(id), 'TreeMap data requires an id');
            throwIf(isNil(name), `TreeMap labelField '${labelField}' not found for record ${id}`);
            throwIf(isNil(value), `TreeMap valueField '${valueField}' not found for record ${id}`);
            throwIf(isNil(colorValue), `TreeMap heatField '${heatField}' not found for record ${id}`);

            // Create TreeMapRecord
            const item = {
                id,
                record,
                name,
                value: Math.abs(value),
                colorValue: Math.abs(colorValue)
            };

            if (children) {
                this.processDataRecursive(children, id, ret);
            }

            if (parentId) {
                item.parent = parentId;
            }

            ret.push(item);
        });

        return ret;
    }

}

/**
 * @typedef {Object} TreeMapRecord
 * @property {(string|number)} id - Record id
 * @property {(Record|object)} record - Raw record or object from which TreeMapRecord was created.
 * @property {string} name - Used by Highcharts to determine the node label.
 * @property {number} value - Used by Highcharts to determine the node size.
 * @property {number} colorValue - Used by Highcharts to determine the color in a heat map.
 */

/**
 * @callback TreeMapModel~tooltipFn - normalized renderer function to produce a tree map tooltip.
 * @param {*} value - raw node data value.
 * @param {Record} record - row-level data Record.
 * @return {string} - the formatted value for display.
 */