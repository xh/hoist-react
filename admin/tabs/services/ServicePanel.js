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
import {refreshButton, storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {ServiceModel} from './ServiceModel';

@hoistComponent()
export class ServicePanel extends Component {

    localModel = new ServiceModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.model.gridModel})
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

    onClearCachesClick = () => {
        this.model.clearCaches();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}