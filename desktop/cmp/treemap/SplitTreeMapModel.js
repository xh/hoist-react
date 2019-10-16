/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

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
@HoistModel
export class SplitTreeMapModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {function} */
    mapFilter;
    /** @member {function} */
    mapTitleFn;
    /** @member {string} */
    orientation;

    /** @member {TreeMapModel} */
    @managed primaryMapModel;
    /** @member {TreeMapModel} */
    @managed secondaryMapModel;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref highchartsConfig = {};

    /**
     * @param {Object} c - SplitTreeMapModel configuration.
     * @param {SplitTreeMapFilterFn} [c.mapFilter] - filter used to allocate records between the
     *      primary and secondary maps. Defaults to: `record[valueField] >= 0`.
     * @param {SplitTreeMapTitleFn} [c.mapTitleFn] - function to render region titles.
     * @param {string} [c.orientation] - 'vertical' (default) to display primary and secondary maps
     *      one above the other, 'horizontal' to show them side-by-side.
     *
     * Additionally accepts any {@see TreeMapModel} configuration options.
     */
    constructor({
        mapFilter,
        mapTitleFn,
        orientation = 'vertical',
        ...rest
    } = {}) {
        this.mapFilter = withDefault(mapFilter, this.defaultMapFilter);
        this.mapTitleFn = mapTitleFn;

        throwIf(!['vertical', 'horizontal'].includes(orientation), `Orientation "${orientation}" not recognised.`);
        this.orientation = orientation;

        // Create child TreeMaps
        this.primaryMapModel = new TreeMapModel({
            ...rest,
            filter: (record) => this.mapFilter(record)
        });
        this.secondaryMapModel = new TreeMapModel({
            ...rest,
            filter: (record) => !this.mapFilter(record)
        });
    }

    defaultMapFilter(record) {
        const {valueField} = this.primaryMapModel;
        return record[valueField] >= 0;
    }

}

/**
 * @callback SplitTreeMapFilterFn
 * @param {Record} record - record to evaluate for inclusion in the primary vs. secondary map.
 * @return {boolean} - true if record belongs to / should appear within the primary map, falsey to
 *      have it allocated to the secondary map.
 */

/**
 * @callback SplitTreeMapTitleFn
 * @param {TreeMapModel} treeMapModel - model for the region's inner TreeMap.
 * @param {boolean} isPrimary - true if the region is the primary (top/left) map in the pair.
 * @return {(String|ReactNode)} - the region title to display.
 */
