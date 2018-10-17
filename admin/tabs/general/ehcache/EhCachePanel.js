/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {EhCacheModel} from './EhCacheModel';

@HoistComponent
export class EhCachePanel extends Component {

    localModel = new EhCacheModel();

    render() {
        return panel({
            tbar: this.renderToolbar(),
            item: grid({model: this.model.gridModel})
        });
    }

    renderToolbar() {
        const {model} = this,
            {gridModel} = model;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear All',
                onClick: this.onClearAllClick
            }),
            toolbarSep(),
            refreshButton({model}),
            filler(),
            storeCountLabel({gridModel, unit: 'cache'}),
            storeFilterField({gridModel})
        );
    }

    onClearAllClick = () => {
        this.model.clearAll();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
