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
import {label, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
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
                this.renderCachesCount(),
                storeFilterField({
                    store: this.ehCacheModel.store,
                    fields: ['name', 'status']
                })
            ]
        });
    }

    onClearAllClick = () => {
        this.ehCacheModel.clearAll();
    }

    onRefreshClick = () => {
        return this.ehCacheModel.loadAsync();
    }

    // probably going to turn into it's own cmp
    renderCachesCount() {
        const store = this.ehCacheModel.store;
        return label(store.count + ' caches');
    }

    async loadAsync() {
        return this.ehCacheModel.loadAsync();
    }

}
