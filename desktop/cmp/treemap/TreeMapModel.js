/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, observable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {isNil, maxBy, minBy} from 'lodash';

/**
 * Todo
 */
@HoistModel
export class TreeMapModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {Store} */
    store;
    /** @member {GridModel} */
    gridModel;
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
    /** @member {number} */
    maxDepth;
    /** @member {function} */
    filter;
    /** @member {function} */
    onClick;
    /** @member {function} */
    onDoubleClick;
    /** @member {string} */
    algorithm;
    /** @member {(boolean|TreeMapModel~tooltipFn)} */
    tooltip;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref highchartsConfig = {};
    /** @member {TreeMapRecord[]} */
    @observable.ref data = [];

    /**
     * @param {Object} c - TreeMapModel configuration.
     * @param {Store} [c.store] - A store containing records to be displayed.
     * @param {GridModel} [c.gridModel] - Optional GridModel to bind to.
     * @param {Object} [c.highchartsConfig] - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {string} c.labelField - Record field to use to determine node label.
     * @param {string} c.valueField - Record field to use to determine node size.
     * @param {string} c.heatField - Record field to use to determine node color.
     * @param {string} [c.valueFieldLabel] - Label for valueField to render in the default tooltip.
     * @param {string} [c.heatFieldLabel] - Label for heatField to render in the default tooltip.
     * @param {number} [c.maxDepth] - Maximum tree depth to render.
     * @parma {function} [c.filter] - A filter function used when processing data. Receives (record), returns boolean.
     * @param {function} [c.onClick] - Callback to call when a node is clicked. Receives (record, e).
     *      If not provided, by default will select a record when using a GridModel.
     * @param {function} [c.onDoubleClick] - Callback to call when a node is double clicked. Receives (record, e).
     *      If not provided, by default will expand / collapse a record when using a GridModel.
     * @param {string} [c.algorithm] - Layout algorithm to use. Either 'sliceAndDice', 'stripes', 'squarified' or 'strip'.
     * @param {(boolean|TreeMapModel~tooltipFn)} [c.tooltip] - 'true' to use the default tooltip renderer, or a custom
     *      tooltipFn which returns a string output of the node's value.
     */
    constructor({
        store,
        gridModel,
        highchartsConfig,
        labelField = 'name',
        valueField = 'value',
        heatField = 'value',
        valueFieldLabel,
        heatFieldLabel,
        maxDepth,
        filter,
        onClick,
        onDoubleClick,
        algorithm = 'squarified',
        tooltip = true
    } = {}) {
        this.gridModel = gridModel;
        this.store = store ? store : gridModel ? gridModel.store : null;
        throwIf(!this.store,  'TreeMapModel requires either a Store or a GridModel');

        this.highchartsConfig = highchartsConfig;
        this.labelField = labelField;
        this.valueField = valueField;
        this.heatField = heatField;
        this.valueFieldLabel = valueFieldLabel;
        this.heatFieldLabel = heatFieldLabel;
        this.maxDepth = maxDepth;
        this.filter = filter;
        this.tooltip = tooltip;

        this.onClick = withDefault(onClick, this.defaultOnClick);
        this.onDoubleClick = withDefault(onDoubleClick, this.defaultOnDoubleClick);

        throwIf(!['sliceAndDice', 'stripes', 'squarified', 'strip'].includes(algorithm), `Algorithm "${algorithm}" not recognised.`);
        this.algorithm = algorithm;

        this.addReaction({
            track: () => [this.store.rootRecords, this.expandedIds],
            run: ([rawData]) => this.data = this.processData(rawData)
        });
    }

    get selectedIds() {
        if (!this.gridModel || this.gridModel.selModel.mode === 'disabled') return [];
        return this.gridModel.selModel.ids;
    }

    get expandedIds() {
        if (!this.gridModel) return [];
        return this.gridModel.expandedTreeNodes;
    }

    //-------------------------
    // Data
    //-------------------------
    processData(rawData) {
        const ret = this.processRecordsRecursive(rawData);
        return this.normaliseColorValues(ret);
    }

    processRecordsRecursive(rawData, parentId = null, depth = 1) {
        const {labelField, valueField, heatField, maxDepth} = this,
            ret = [];

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
            const treeRec = {
                id,
                record,
                name,
                colorValue,
                value: Math.abs(value)
            };

            if (parentId) treeRec.parent = parentId;

            // Process children if:
            // a) There are children
            // b) This node is expanded
            // c) The children do not exceed any specified maxDepth
            let childTreeRecs = [];
            if (children && this.expandedIds.includes(id) && (!maxDepth || depth < maxDepth)) {
                childTreeRecs = this.processRecordsRecursive(children, id, depth + 1);
            }

            // Include record and its children if:
            // a) There is no filter
            // b) There is a filter and the record passes it
            // c) There is a filter and any of its children passes it
            if (!this.filter || this.filter(record) || childTreeRecs.length) {
                ret.push(treeRec);
                ret.push(...childTreeRecs);
            }
        });

        return ret;
    }

    normaliseColorValues(data) {
        if (!data.length) return [];

        const maxPosHeat = Math.max(maxBy(data, 'colorValue').colorValue, 0),
            maxNegHeat = Math.min(minBy(data, 'colorValue').colorValue, 0);

        data.forEach(it => {
            if (it.colorValue > 0) {
                // Normalize between 0.5-1
                const norm = this.normalize(it.colorValue, 0, maxPosHeat);
                it.colorValue = (norm / 2) + 0.5;
            } else if (it.colorValue < 0) {
                // Normalize between 0-0.5
                const norm = this.normalize(Math.abs(it.colorValue), Math.abs(maxNegHeat), 0);
                it.colorValue = (norm / 2);
            } else {
                it.colorValue = 0.5; // Exactly zero
            }
        });

        return data;
    }

    normalize(value, min, max) {
        // Return value between 0-1
        return (value - min) / (max - min);
    }

    //----------------------
    // Click handling
    //----------------------
    defaultOnClick = (record, e) => {
        if (!this.gridModel) return;

        // Select nodes in grid
        const {selModel} = this.gridModel;
        if (selModel.mode === 'disabled') return;

        const multiSelect = selModel.mode === 'multiple' && e.shiftKey;
        selModel.select(record, !multiSelect);
    };

    defaultOnDoubleClick = (record, e) => {
        if (!this.gridModel || !this.gridModel.treeMode) return;
        this.gridModel.toggleExpanded(record.id);
    };

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