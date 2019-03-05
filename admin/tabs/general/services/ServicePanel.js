/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

@HoistComponent
export class ServicePanel extends Component {
    
    model = new ServiceModel();

    render() {
        const {model} = this;

        return panel({
            mask: model.loadModel,
            tbar: this.renderToolbar(),
            item: grid({
                model: model.gridModel,
                hideHeaders: true,
                agOptions: {
                    groupRowInnerRenderer: (params) => params.value + ' Services'
                }
            })
        });
    }

    renderToolbar() {
        const {model} = this,
            {gridModel} = model;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear Caches',
                onClick: () => model.clearCaches(),
                disabled: gridModel.selModel.isEmpty
            }),
            filler(),
            storeCountLabel({gridModel, unit: 'service'}),
            storeFilterField({gridModel}),
            exportButton({gridModel})
        );
    }
}