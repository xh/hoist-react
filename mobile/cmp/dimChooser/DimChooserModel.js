/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {select} from '@xh/hoist/mobile/cmp/form'
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';
import {withDefault} from '@xh/hoist/utils/js';
import {DimensionChooserModel} from '@xh/hoist/desktop/cmp/dimensionchooser'
import {hbox} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {observable} from 'mobx';


@HoistModel
export class DimChooserModel {

    @observable.ref menuModel = null;
    dimensionChooserModel = null;

    /**
     * @param c - DimensionChooserModel configuration.
     * @param {string[]|Object[]} c.dimensions - dimensions available for selection. The object
     *      form supports value, label, and leaf keys, where `leaf: true` indicates that the
     *      dimension does not support any further sub-groupings.
     * @param {string[]} [c.initialValue] - initial dimensions if history empty / not configured.
     *      If neither are specified, the first available dimension will be used as the value.
     * @param {string} [c.historyPreference] - preference key used to persist the user's most
     *      recently selected groupings for easy re-selection.
     */
    constructor({
                    dimensions,
                    initialValue,
                    historyPreference,
                }) {
        this.dimensionChooserModel = new DimensionChooserModel({
            dimensions,
            initialValue,
            historyPreference,
            maxHistoryLength: 5,
            maxDepth: 4
        });
        this.addReaction({
            track: () => [this.dimensionChooserModel.value, this.dimensionChooserModel.pendingValue],
            run: () => {
                const itemModels = this.getItemModels();
                this.menuModel = new MenuModel({
                    itemModels,
                    xPos: 50,
                    yPos: 100
                })
            },
            fireImmediately: true
        });

    }


    getItemModels() {
        const {dimensionChooserModel} = this,
            {pendingValue, dimensions} = dimensionChooserModel;
        console.log(dimensionChooserModel.dimOptionsForLevel(0))
        return pendingValue.map((dim, i) => {
            const options = [{value: '', label: ''}, ...dimensionChooserModel.dimOptionsForLevel(i)];
            return {
                element: select({
                    options,
                    value: dimensions[dim].label,
                    onChange: (e) => dimensionChooserModel.addPendingDim(e.target.value, i)
                })
            }
        })
    }


}