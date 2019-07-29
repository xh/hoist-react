/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, computed} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, isFunction, sumBy} from 'lodash';

import {TreeMapModel} from './TreeMapModel';

/**
 * Todo
 */
@HoistModel
export class SplitTreeMapModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {GridModel} */
    gridModel;
    /** @member {function} */
    regionFilter;
    /** @member {Object} */
    treeMapModelConfig;
    /** @member {string} */
    orientation;

    /** @member {TreeMapModel} */
    @managed primaryRegionModel;
    /** @member {TreeMapModel} */
    @managed secondaryRegionModel;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref config = {};

    @computed
    get primaryRegionTotal() {
        return sumBy(this.primaryRegionModel.data, it => {
            // Only include root records that pass the filter
            if (it.parent || !this.regionFilter(it.record)) return 0;
            return it.value;
        });
    }

    @computed
    get secondaryRegionTotal() {
        return sumBy(this.secondaryRegionModel.data, it => {
            // Only include root records that don't pass the filter
            if (it.parent || this.regionFilter(it.record)) return 0;
            return it.value;
        });
    }

    /**
     * @param {Object} c - SplitTreeMapModel configuration.
     * @param {Object} c.config - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {GridModel} c.gridModel - Optional GridModel to bind to.
     * @param {function} c.regionFilter - A filter function used when processing data. Receives (record), returns boolean.
     *      Records that pass the filter will be placed into the primary TreeMap, and the rest into the secondary TreeMap.
     * @param {Object} [c.treeMapModelConfig] - config to be passed to underlying TreeMapModels
     * @param {string} [c.orientation] - Display primary TreeMap above ('vertical') or to the right ('horizontal') of secondary TreeMap.
     */
    constructor({
        config,
        gridModel,
        regionFilter,
        treeMapModelConfig,
        orientation = 'vertical'
    } = {}) {
        throwIf(isNil(gridModel), 'SplitTreeMap requires a GridModel.');
        throwIf(!isFunction(regionFilter), 'SplitTreeMap requires a region filter function.');

        this.config = config;
        this.gridModel = gridModel;
        this.regionFilter = regionFilter;
        this.treeMapModelConfig = treeMapModelConfig;

        throwIf(!['vertical', 'horizontal'].includes(orientation), `Orientation "${orientation}" not recognised.`);
        this.orientation = orientation;

        // Create child TreeMaps
        this.primaryRegionModel = new TreeMapModel({
            ...this.treeMapModelConfig,
            gridModel,
            config,
            filter: (rec) => regionFilter(rec)
        });
        this.secondaryRegionModel = new TreeMapModel({
            ...this.treeMapModelConfig,
            gridModel,
            config,
            filter: (rec) => !regionFilter(rec)
        });
    }

}