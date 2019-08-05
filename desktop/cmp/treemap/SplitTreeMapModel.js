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
     * @param {function} c.mapFilter - A filter function used when processing data. Receives (record), returns boolean.
     *      Records that pass the filter will be placed into the primary TreeMap, and the rest into the secondary TreeMap.
     *      If not passed, will default to: { return record.valueField >= 0; }
     * @param {function} [c.mapTitleFn] - Function to render map titles. Receives map name ['primary', 'secondary'] and region TreeMapModel.
     * @param {string} [c.orientation] - Display primary TreeMap above ('vertical') or to the right ('horizontal') of secondary TreeMap.
     *
     * Additionally accepts any TreeMapModel configuration options. @see TreeMapModel.
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