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
import {label, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {ServiceModel} from './ServiceModel';

@hoistComponent()
export class ServicePanel extends Component {

    serviceModel = new ServiceModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.serviceModel.gridModel})
        );
    }

    renderToolbar() {
        const model = this.serviceModel;
        return toolbar({
            items: [
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
                this.renderServicesCount(),
                storeFilterField({
                    store: model.store,
                    fields: ['name']
                })
            ]
        });
    }

    onClearCachesClick = () => {
        this.serviceModel.clearCaches();
    }

    onRefreshClick = () => {
        return this.serviceModel.loadAsync();
    }

    renderServicesCount() {
        const store = this.serviceModel.store;
        return label(store.count + ' services');
    }

    async loadAsync() {
        return this.serviceModel.loadAsync();
    }
}