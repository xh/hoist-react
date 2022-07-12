/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {uniq} from 'lodash';

import {TreeMapModel} from './TreeMapModel';

/**
 * Core Model for a SplitTreeMap.
 *
 * Binds to a Store (or GridModel) and splits the data into two managed child TreeMaps.
 * Users should specify a `mapFilter` function to control how records are divided
 * across the two TreeMaps.
 *
 * Additionally, accepts and passes along all settings for TreeMapModel.
 * @see TreeMapModel
 */
export class SplitTreeMapModel extends HoistModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {function} */
    mapFilter;
    /** @member {function} */
    mapTitleFn;
    /** @member {boolean} */
    showSplitter;

    /** @member {TreeMapModel} */
    @managed primaryMapModel;
    /** @member {TreeMapModel} */
    @managed secondaryMapModel;

    //------------------------
    // Observable API
    //------------------------
    /** @member {string} */
    @bindable orientation;

    /**
     * @param {Object} c - SplitTreeMapModel configuration.
     * @param {SplitTreeMapFilterFn} [c.mapFilter] - filter used to allocate records between the
     *      primary and secondary maps. Defaults to: `record[valueField] >= 0`.
     * @param {SplitTreeMapTitleFn} [c.mapTitleFn] - function to render region titles.
     * @param {boolean} [c.showSplitter] - true to insert a four pixel buffer between the two maps.
            Defaults to false.
     * @param {string} [c.orientation] - 'vertical' (default) to display primary and secondary maps
     *      one above the other, 'horizontal' to show them side-by-side.
     *
     * Additionally accepts any {@see TreeMapModel} configuration options.
     */
    constructor({
        mapFilter,
        mapTitleFn,
        showSplitter = false,
        orientation = 'vertical',
        ...rest
    } = {}) {
        super();
        makeObservable(this);
        this.mapFilter = withDefault(mapFilter, this.defaultMapFilter);
        this.mapTitleFn = mapTitleFn;
        this.showSplitter = showSplitter;

        throwIf(!['vertical', 'horizontal'].includes(orientation), `Orientation "${orientation}" not recognised.`);
        this.orientation = orientation;

        this.primaryMapModel = new TreeMapModel({...rest, filter: (r) => this.mapFilter(r)});
        this.secondaryMapModel = new TreeMapModel({...rest, filter: (r) => !this.mapFilter(r)});
    }

    // Getters derived from both underlying TreeMapModels.
    @computed
    get total() {
        return this.primaryMapModel.total && this.secondaryMapModel.total;
    }

    @computed
    get selectedIds() {
        return uniq([...this.primaryMapModel.selectedIds, ...this.secondaryMapModel.selectedIds]);
    }

    @computed
    get isMasking() {
        return this.primaryMapModel.isMasking || this.secondaryMapModel.isMasking;
    }

    @computed
    get empty() {
        return this.primaryMapModel.empty && this.secondaryMapModel.empty;
    }

    // Simple getters and methods trampolined from underlying TreeMapModels.
    // Where possible, we consult only the primary map model, as we don't expect the two to become out of sync.
    get expandState()       {return this.primaryMapModel.expandState}
    get error()             {return this.primaryMapModel.error}
    get emptyText()         {return this.primaryMapModel.emptyText}
    get highchartsConfig()  {return this.primaryMapModel.highchartsConfig}
    get labelField()        {return this.primaryMapModel.labelField}
    get heatField()         {return this.primaryMapModel.heatField}
    get maxDepth()          {return this.primaryMapModel.maxDepth}
    get maxHeat()           {return this.primaryMapModel.maxHeat}
    get algorithm()         {return this.primaryMapModel.algorithm}
    get colorMode()         {return this.primaryMapModel.colorMode}
    get theme()             {return this.primaryMapModel.theme}

    @action
    setHighchartsConfig(...args) {
        this.primaryMapModel.setHighchartsConfig(...args);
        this.secondaryMapModel.setHighchartsConfig(...args);
    }

    @action
    setLabelField(...args) {
        this.primaryMapModel.setLabelField(...args);
        this.secondaryMapModel.setLabelField(...args);
    }

    @action
    setHeatField(...args) {
        this.primaryMapModel.setHeatField(...args);
        this.secondaryMapModel.setHeatField(...args);
    }

    @action
    setMaxDepth(...args) {
        this.primaryMapModel.setMaxDepth(...args);
        this.secondaryMapModel.setMaxDepth(...args);
    }

    @action
    setMaxHeat(...args) {
        this.primaryMapModel.setMaxHeat(...args);
        this.secondaryMapModel.setMaxHeat(...args);
    }

    @action
    setAlgorithm(...args) {
        this.primaryMapModel.setAlgorithm(...args);
        this.secondaryMapModel.setAlgorithm(...args);
    }

    @action
    setColorMode(...args) {
        this.primaryMapModel.setColorMode(...args);
        this.secondaryMapModel.setColorMode(...args);
    }

    @action
    setTheme(...args) {
        this.primaryMapModel.setTheme(...args);
        this.secondaryMapModel.setTheme(...args);
    }

    //-------------------------
    // Implementation
    //-------------------------
    defaultMapFilter = (record) => {
        return record.get(this.primaryMapModel.valueField) >= 0;
    }
}

/**
 * @callback SplitTreeMapFilterFn
 * @param {StoreRecord} record - record to evaluate for inclusion in the primary vs. secondary map.
 * @return {boolean} - true if record belongs to / should appear within the primary map, falsy to
 *      have it allocated to the secondary map.
 */

/**
 * @callback SplitTreeMapTitleFn
 * @param {TreeMapModel} treeMapModel - model for the region's inner TreeMap.
 * @param {boolean} isPrimary - true if the region is the primary (top/left) map in the pair.
 * @return {(string|ReactNode)} - the region title to display.
 */
