/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, computed} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, sumBy} from 'lodash';

import {TreeMapModel} from './TreeMapModel';

/**
 * Todo
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

    @computed
    get primaryMapTotal() {
        return sumBy(this.primaryMapModel.data, it => {
            // Only include root records that pass the filter
            if (it.parent || !this.mapFilter(it.record)) return 0;
            return it.value;
        });
    }

    @computed
    get secondaryMapTotal() {
        return sumBy(this.secondaryMapModel.data, it => {
            // Only include root records that don't pass the filter
            if (it.parent || this.mapFilter(it.record)) return 0;
            return it.value;
        });
    }

    /**
     * @param {Object} c - SplitTreeMapModel configuration.
     * @param {function} c.mapFilter - A filter function used when processing data. Receives (record), returns boolean.
     *      Records that pass the filter will be placed into the primary TreeMap, and the rest into the secondary TreeMap.
     * @param {function} [c.mapTitleFn] - Function to render map titles. Receives map name ['primary', 'secondary'] and SplitTreeMapModel.
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
        throwIf(!isFunction(mapFilter), 'SplitTreeMap requires a map filter function.');
        this.mapFilter = mapFilter;
        this.mapTitleFn = mapTitleFn;

        throwIf(!['vertical', 'horizontal'].includes(orientation), `Orientation "${orientation}" not recognised.`);
        this.orientation = orientation;

        // Create child TreeMaps
        this.primaryMapModel = new TreeMapModel({
            ...rest,
            filter: (rec) => mapFilter(rec)
        });
        this.secondaryMapModel = new TreeMapModel({
            ...rest,
            filter: (rec) => !mapFilter(rec)
        });
    }

}