/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {HoistComponent} from 'hoist/core';
import {grid} from 'hoist/cmp/grid';
import {filler} from 'hoist/cmp/layout';
import {panel, toolbar, toolbarSep} from 'hoist/cmp';
import {refreshButton} from 'hoist/cmp/button';
import {storeCountLabel, storeFilterField} from 'hoist/cmp/store';
import {Icon} from 'hoist/icon';

import {EhCacheModel} from './EhCacheModel';

@HoistComponent()
export class EhCachePanel extends Component {

    localModel = new EhCacheModel();

    render() {
        return panel({
            tbar: this.renderToolbar(),
            item: grid({model: this.model.gridModel})
        });
    }

    renderToolbar() {
        const model = this.model,
            {store} = model.gridModel;
        return toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear All',
                onClick: this.onClearAllClick
            }),
            toolbarSep(),
            refreshButton({model}),
            filler(),
            storeCountLabel({
                store,
                unit: 'cache'
            }),
            storeFilterField({
                store,
                fields: ['name', 'status']
            })
        );
    }

    onClearAllClick = () => {
        this.model.clearAll();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
