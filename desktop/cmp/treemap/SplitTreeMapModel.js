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
    filter;
    /** @member {Object} */
    treeMapModelConfig;
    /** @member {string} */
    orientation;

    /** @member {TreeMapModel} */
    @managed posModel;
    /** @member {TreeMapModel} */
    @managed negModel;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object} */
    @bindable.ref config = {};

    @computed
    get posRootTotal() {
        return sumBy(this.posModel.data, it => it.parent ? 0 : it.value);
    }

    @computed
    get negRootTotal() {
        return sumBy(this.negModel.data, it => it.parent ? 0 : it.value);
    }

    /**
     * @param {Object} c - SplitTreeMapModel configuration.
     * @param {Object} c.config - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {GridModel} c.gridModel - Optional GridModel to bind to.
     * @param {function} c.filter - A filter function used when processing data. Receives (record), returns boolean.
     *      Records that pass the filter will be placed into the positive TreeMap, and the rest into the negative TreeMap.
     * @param {Object} [c.treeMapModelConfig] - config to be passed to underlying TreeMapModels
     * @param {string} [c.orientation] - Display positive values above ('vertical') or to the right ('horizontal') of negative values.
     */
    constructor({
        config,
        gridModel,
        filter,
        treeMapModelConfig,
        orientation = 'vertical'
    } = {}) {
        throwIf(isNil(gridModel), 'SplitTreeMap requires a GridModel.');
        throwIf(!isFunction(filter), 'SplitTreeMap requires a filter function.');

        this.config = config;
        this.gridModel = gridModel;
        this.filter = filter;
        this.treeMapModelConfig = treeMapModelConfig;

        if (!['vertical', 'horizontal'].includes(orientation)) {
            console.warn(`Orientation ${orientation} not recognised. Defaulting to 'vertical'.`);
            orientation = 'vertical';
        }
        this.orientation = orientation;

        // Create child TreeMaps
        this.posModel = new TreeMapModel({
            ...this.treeMapModelConfig,
            gridModel,
            config,
            filter: (rec) => filter(rec)
        });
        this.negModel = new TreeMapModel({
            ...this.treeMapModelConfig,
            gridModel,
            config,
            filter: (rec) => !filter(rec)
        });
    }

}