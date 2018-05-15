/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler, vframe} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {refreshButton, storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {ServiceModel} from './ServiceModel';

@HoistComponent()
export class ServicePanel extends Component {

    localModel = new ServiceModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({
                model: this.model.gridModel,
                agOptions: {
                    rowSelection: 'multiple',
                    groupRowInnerRenderer: this.groupRowInnerRenderer
                }
            })
        );
    }

    renderToolbar() {
        const model = this.model,
            {store, selection} = model.gridModel;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear Caches',
                onClick: this.onClearCachesClick,
                disabled: selection.isEmpty
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