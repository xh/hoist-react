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
import {vframe, filler} from 'hoist/layout';
import {storeCountLabel, storeFilterField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {UserModel} from './UserModel';

@hoistComponent()
export class UserPanel extends Component {

    localModel = new UserModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.model.gridModel})
        );
    }

    renderToolbar() {
        const store = this.model.store;
        return toolbar(
            button({
                icon: Icon.sync(),
                onClick: this.onRefreshClick
            }),
            filler(),
            storeCountLabel({
                store,
                unitConfig: {singular: 'user', plural: 'users'}
            }),
            storeFilterField({
                store,
                fields: ['displayName', 'roles']
            })
        );
    }

    onRefreshClick = () => {
        this.loadAsync();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
