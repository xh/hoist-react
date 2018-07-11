/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {filler} from '@xh/hoist/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {refreshButton, button} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

@HoistComponent()
export class ServicePanel extends Component {

    localModel = new ServiceModel();

    render() {
        return panel({
            tbar: this.renderToolbar(),
            item: grid({
                model: this.model.gridModel,
                agOptions: {
                    groupRowInnerRenderer: this.groupRowInnerRenderer
                }
            })
        });
    }

    renderToolbar() {
        const {model} = this,
            {store, selModel} = model.gridModel;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear Caches',
                onClick: this.onClearCachesClick,
                disabled: selModel.isEmpty
            }),
            toolbarSep(),
            refreshButton({model}),
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

    groupRowInnerRenderer(params) {
        return params.value + ' Services';
    }

    onClearCachesClick = () => {
        this.model.clearCaches();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}