/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler, vframe} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {ServiceModel} from './ServiceModel';

@hoistComponent()
export class ServicePanel extends Component {

    localModel = new ServiceModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({
                model: this.model.gridModel,
                gridOptions: {
                    // ag-grid: groupDefaultExpanded can no longer be boolean. for groupDefaultExpanded=true, use groupDefaultExpanded=9999 instead
                    groupDefaultExpanded: 9999,
                    groupUseEntireRow: true,
                    groupRowInnerRenderer: function(params) {
                        return params.value + ' Services';
                    }
                }
            })
        );
    }

    renderToolbar() {
        const model = this.model,
            store = model.store;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear Caches',
                onClick: this.onClearCachesClick,
                disabled: model.gridModel.selection.isEmpty
            }),
            toolbarSep(),
            button({
                icon: Icon.sync(),
                onClick: this.onRefreshClick
            }),
            filler(),
            storeCountLabel({
                store,
                unit: 'service'
            }),
            storeFilterField({
                store,
                fields: ['name']
            })
        );
    }

    onClearCachesClick = () => {
        this.model.clearCaches();
    }

    onRefreshClick = () => {
        this.loadAsync();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}