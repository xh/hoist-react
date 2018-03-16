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
import {storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {EhCacheModel} from './EhCacheModel';

@hoistComponent()
export class EhCachePanel extends Component {

    ehCacheModel = new EhCacheModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.ehCacheModel.gridModel})
        );
    }

    renderToolbar() {
        const store = this.ehCacheModel.store;
        return toolbar({
            items: [
                button({
                    icon: Icon.sync(),
                    text: 'Clear All',
                    onClick: this.onClearAllClick
                }),
                toolbarSep(),
                button({
                    icon: Icon.sync(),
                    onClick: this.onRefreshClick
                }),
                filler(),
                storeCountLabel({
                    store: store,
                    unitConfig: {singular: 'cache', plural: 'caches'}
                }),
                storeFilterField({
                    store: store,
                    fields: ['name', 'status']
                })
            ]
        });
    }

    onClearAllClick = () => {
        this.ehCacheModel.clearAll();
    }

    onRefreshClick = () => {
        this.loadAsync();
    }

    async loadAsync() {
        return this.ehCacheModel.loadAsync();
    }

}
