/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {hoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler, vframe} from 'hoist/layout';
import {refreshButton, storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {EhCacheModel} from './EhCacheModel';

@hoistComponent()
export class EhCachePanel extends Component {

    localModel = new EhCacheModel();

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
