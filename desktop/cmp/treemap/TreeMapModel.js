/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, observable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {cloneDeep, get, isEmpty, isFinite, partition, set, sumBy, unset} from 'lodash';

/**
 * Core Model for a TreeMap.
 *
 * You should specify the TreeMap's data store, in addition to which Record fields should be
 * mapped to label (a node's display name), value (a node's size), and heat (a node's color).
 *
 * Can also (optionally) be bound to a GridModel. This will enable selection syncing and
 * expand / collapse syncing for GridModels in `treeMode`.
 *
 * Supports any Highcharts TreeMap algorithm ('squarified', 'sliceAndDice', 'stripes' or 'strip').
 *
 * Node colors are normalized to a 0-1 range and mapped to a colorAxis via the following colorModes:
 * 'linear' distributes normalized color values across the colorAxis according to the heatField.
 * 'balanced' attempts to account for outliers by adjusting normalisation ranges around the median.
 * 'none' will ignore the colorAxis, and instead use the flat color.
 *
 * Color customization can be managed by setting colorAxis stops via the `highchartsConfig`.
 * @see Dark and Light themes for colorAxis example.
 *
 * @see https://www.highcharts.com/docs/chart-and-series-types/treemap for Highcharts config options
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
    /** @member {number} */
    maxNodes;
    /** @member {function} */
    onClick;
    /** @member {function} */
    onDoubleClick;
    /** @member {(boolean|TreeMapModel~tooltipFn)} */
    tooltip;
    /** @member {string} */
    emptyText;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref highchartsConfig = {};
    /** @member {TreeMapRecord[]} */
    @observable.ref data = [];
    /** @member {string} */
    @bindable labelField;
    /** @member {string} */
    @bindable valueField;
    /** @member {string} */
    @bindable heatField;
    /** @member {number} */
    @bindable maxDepth;
    /** @member {string} */
    @bindable algorithm;
    /** @member {string} */
    @bindable colorMode;

    _filter;

    /**
     * @param {Object} c - TreeMapModel configuration.
     * @param {Store} [c.store] - A store containing records to be displayed.
     * @param {GridModel} [c.gridModel] - Optional GridModel to bind to.
     * @param {number} [c.maxNodes] - Maximum number of nodes to render. Be aware that increasing
     *     this can severely degrade performance.
     * @param {Object} [c.highchartsConfig] - Highcharts configuration object for the managed
     *     chart. May include any Highcharts opts other than `series`, which should be set via
     *     dedicated config.
     * @param {string} c.labelField - Record field to use to determine node label.
     * @param {string} c.valueField - Record field to use to determine node size.
     * @param {string} c.heatField - Record field to use to determine node color.
     * @param {number} [c.maxDepth] - Maximum tree depth to render.
     * @param {string} [c.algorithm] - Layout algorithm to use. Either 'squarified',
     *     'sliceAndDice', 'stripes' or 'strip'. Defaults to 'squarified'.
     *     {@see https://www.highcharts.com/docs/chart-and-series-types/treemap} for examples.
     * @param {string} [c.colorMode] - Heat color distribution mode. Either 'linear', 'balanced' or
     *     'none'. Defaults to 'linear'.
     * @param {function} [c.onClick] - Callback to call when a node is clicked. Receives (record,
     *     e). If not provided, by default will select a record when using a GridModel.
     * @param {function} [c.onDoubleClick] - Callback to call when a node is double clicked.
     *     Receives (record, e). If not provided, by default will expand / collapse a record when
     *     using a GridModel.
     * @param {(boolean|TreeMapModel~tooltipFn)} [c.tooltip] - 'true' to use the default tooltip
     *     renderer, or a custom tooltipFn which returns a string output of the node's value.
     * @param {(Element|string)} [c.emptyText] - Element/text to render if TreeMap has no records.
     *      Defaults to null, in which case no empty text will be shown.
     */
    constructor({
        store,
        gridModel,
        maxNodes = 1000,
        highchartsConfig,
        labelField = 'name',
        valueField = 'value',
        heatField = 'value',
        maxDepth,
        algorithm = 'squarified',
        colorMode = 'linear',
        onClick,
        onDoubleClick,
        tooltip = true,
        emptyText,
        filter
    } = {}) {
        this.gridModel = gridModel;
        this.store = store ? store : gridModel ? gridModel.store : null;
        throwIf(!this.store,  'TreeMapModel requires either a Store or a GridModel');
        this.maxNodes = maxNodes;

        this.highchartsConfig = highchartsConfig;
        this.labelField = labelField;
        this.valueField = valueField;
        this.heatField = heatField;
        this.maxDepth = maxDepth;

        throwIf(!['sliceAndDice', 'stripes', 'squarified', 'strip'].includes(algorithm), `Algorithm "${algorithm}" not recognised.`);
        this.algorithm = algorithm;

        throwIf(!['linear', 'balanced', 'none'].includes(colorMode), `Color mode "${colorMode}" not recognised.`);
        this.colorMode = colorMode;

        this.onClick = withDefault(onClick, this.defaultOnClick);
        this.onDoubleClick = withDefault(onDoubleClick, this.defaultOnDoubleClick);
        this.tooltip = tooltip;
        this.emptyText = emptyText;

        this._filter = filter;

        this.addReaction({
            track: () => [
                this.store.rootRecords,
                this.expandState,
                this.colorMode,
                this.labelField,
                this.valueField,
                this.heatField,
                this.maxDepth
            ],
            run: ([rawData]) => this.data = this.processData(rawData)
        });
    }

    @computed
    get total() {
        return sumBy(this.data, it => {
            // Only include root records that pass the filter
            if (it.parent || (this._filter && !this._filter(it.record))) return 0;
            return it.value;
        });
    }

    @computed
    get valueFieldLabel() {
        const field = this.store.fields.find(it => it.name === this.valueField);
        return field ? field.label : this.valueField;
    }

    @computed
    get heatFieldLabel() {
        const field = this.store.fields.find(it => it.name === this.heatField);
        return field ? field.label : this.heatField;
    }

    @computed
    get selectedIds() {
        if (!this.gridModel || this.gridModel.selModel.mode === 'disabled') return [];
        return this.gridModel.selModel.ids;
    }

    @computed
    get expandState() {
        if (!this.gridModel || !this.gridModel.treeMode) return {};
        return this.gridModel.expandState;
    }

    @computed
    get hasData() {
        return !isEmpty(this.data);
    }

    @computed
    get error() {
        if (this.data.length > this.maxNodes) return 'Data node limit reached. Unable to render TreeMap.';
        return null;
    }

    //-------------------------
    // Data
    //-------------------------
    processData(rawData) {
        const ret = this.processRecordsRecursive(rawData);
        return this.normaliseColorValues(ret);
    }

    /**
     * Create a flat list of TreeMapRecords from hierarchical store data, ready to be
     * passed to HighCharts for rendering. Drilldown children are included according
     * to the bound GridModel's expandState.
     */
    processRecordsRecursive(rawData, parentId = null, depth = 1) {
        const {labelField, valueField, heatField, maxDepth} = this,
            ret = [];

        rawData.forEach(record => {
            const {id, children, xhTreePath} = record,
                name = record[labelField],
                value = record[valueField],
                heatValue = record[heatField];

            // Skip records without value
            if (!value) return;

            // Create TreeMapRecord
            const treeRec = {
                id,
                record,
                name,
                heatValue,
                value: Math.abs(value)
            };

            if (parentId) treeRec.parent = parentId;

            // Process children if:
            // a) There are children
            // b) This node is expanded
            // c) The children do not exceed any specified maxDepth
            let childTreeRecs = [];
            if (children && this.nodeIsExpanded(xhTreePath) && (!maxDepth || depth < maxDepth)) {
                childTreeRecs = this.processRecordsRecursive(children, id, depth + 1);
            }

            // Include record and its children if:
            // a) There is no filter
            // b) There is a filter and the record passes it
            // c) There is a filter and any of its children passes it
            if (!this._filter || this._filter(record) || childTreeRecs.length) {
                ret.push(treeRec);
                ret.push(...childTreeRecs);
            }
        });

        return ret;
    }

    /**
     * Normalizes heatValues to colorValues between 0-1, where 0 is the maximum negative heat,
     * 1 is the maximum positive heat, and 0.5 is no heat. This allows the colorValue to map to
     * the colorAxis provided to Highcharts.
     *
     * Takes the colorMode into account:
     * a) 'linear' distributes normalized color values across the colorAxis.
     * b) 'balanced' attempts to account for outliers by adjusting the normalisation ranges around
     *  the median values. Can result in more defined color differences in a dataset that is skewed
     *  by a few nodes at the extremes.
     */
    normaliseColorValues(data) {
        const {colorMode} = this;
        if (!data.length || colorMode === 'none') return data;

        // 1) Extract heat values and split into positive and negative
        const heatValues = this.store.records.map(it => it[this.heatField]);
        let [posHeatValues, negHeatValues] = partition(heatValues, it => it > 0);
        posHeatValues = posHeatValues.sort();
        negHeatValues = negHeatValues.map(it => Math.abs(it)).sort();

        // 2) Calculate bounds and midpoints for each range
        let minPosHeat = 0, midPosHeat = 0, maxPosHeat = 0, minNegHeat = 0, midNegHeat = 0, maxNegHeat = 0;
        if (posHeatValues.length) {
            minPosHeat = posHeatValues[0];
            midPosHeat = posHeatValues[Math.floor(posHeatValues.length / 2)];
            maxPosHeat = posHeatValues[posHeatValues.length - 1];
        }
        if (negHeatValues.length) {
            minNegHeat = negHeatValues[0];
            midNegHeat = negHeatValues[Math.floor(negHeatValues.length / 2)];
            maxNegHeat = negHeatValues[negHeatValues.length - 1];
        }

        // 3) Transform heatValue into a normalized colorValue, according to the colorMode.
        data.forEach(it => {
            const {heatValue} = it;

            if (heatValue > 0) {
                // Normalize positive values between 0.6-1
                if (minPosHeat === maxPosHeat) {
                    it.colorValue = 0.8;
                } else if (colorMode === 'balanced' && posHeatValues.length > 2) {
                    if (it.colorValue >= midPosHeat) {
                        it.colorValue = this.normalizeToRange(heatValue, midPosHeat, maxPosHeat, 0.8, 1);
                    } else {
                        it.colorValue = this.normalizeToRange(heatValue, minPosHeat, midPosHeat, 0.6, 0.8);
                    }
                } else if (colorMode === 'linear' || posHeatValues.length === 2) {
                    it.colorValue = this.normalizeToRange(heatValue, minPosHeat, maxPosHeat, 0.6, 1);
                }
            } else if (heatValue < 0) {
                // Normalize negative values between 0-0.4
                const absHeatValue = Math.abs(heatValue);

                if (minNegHeat === maxNegHeat) {
                    it.colorValue = 0.2;
                } else if (colorMode === 'balanced' && negHeatValues.length > 2) {
                    if (absHeatValue >= midNegHeat) {
                        it.colorValue = this.normalizeToRange(absHeatValue, maxNegHeat, midNegHeat, 0, 0.2);
                    } else {
                        it.colorValue = this.normalizeToRange(absHeatValue, midNegHeat, minNegHeat, 0.2, 0.4);
                    }
                } else if (colorMode === 'linear' || negHeatValues.length === 2) {
                    it.colorValue = this.normalizeToRange(absHeatValue, maxNegHeat, minNegHeat, 0, 0.4);
                }
            } else {
                it.colorValue = 0.5; // Exactly zero
            }
        });

        return data;
    }

    /**
     * Takes a value, calculates its normalized (0-1) value within a specified range.
     * If a destination range is provided, returns that value transposed to within that range.
     */
    normalizeToRange(value, fromMin, fromMax, toMin, toMax) {
        const fromRange = (fromMax - fromMin),
            toRange = (toMax - toMin);

        if (isFinite(toRange)) {
            // Return value transposed to destination range
            return (((value - fromMin) * toRange) / fromRange) + toMin;
        } else {
            // Return value between 0-1
            return (value - fromMin) / fromRange;
        }
    }

    //----------------------
    // Expand / Collapse
    //----------------------
    nodeIsExpanded(xhTreePath) {
        if (isEmpty(this.expandState)) return false;
        return get(this.expandState, xhTreePath, false);
    }

    toggleNodeExpanded(xhTreePath) {
        const {gridModel} = this,
            expandState = cloneDeep(gridModel.expandState);

        if (get(expandState, xhTreePath)) {
            unset(expandState, xhTreePath);
        } else {
            set(expandState, xhTreePath, true);
        }

        gridModel.setExpandState(expandState);
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

    defaultOnDoubleClick = (record) => {
        if (!this.gridModel || !this.gridModel.treeMode || isEmpty(record.children)) return;
        this.toggleNodeExpanded(record.xhTreePath);
    };

}

/**
 * @typedef {Object} TreeMapRecord
 * @property {(string|number)} id - Record id
 * @property {Record} record - Store record from which TreeMapRecord was created.
 * @property {string} name - Used by Highcharts to determine the node label.
 * @property {number} value - Used by Highcharts to determine the node size.
 * @property {number} heatValue - transient property used to determine the Highcharts colorValue.
 * @property {number} colorValue - Used by Highcharts to determine the color in a heat map.
 */

/**
 * @callback TreeMapModel~tooltipFn - normalized renderer function to produce a tree map tooltip.
 * @param {*} value - raw node data value.
 * @param {Record} record - row-level data Record.
 * @return {string} - the formatted value for display.
 */