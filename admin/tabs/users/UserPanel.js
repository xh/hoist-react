/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {vframe, filler} from 'hoist/layout';
import {refreshButton, storeCountLabel, storeFilterField, toolbar} from 'hoist/cmp';

import {UserModel} from './UserModel';

@hoistComponent()
export class UserPanel extends Component {

    localModel = new UserModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({
                model: this.model.gridModel,
                gridOptions: {
                    rowSelection: 'single'
                }
            })
        );
    }

    renderToolbar() {
        const model = this.model,
            {store} = model.gridModel;
        return toolbar(
            refreshButton({model}),
            filler(),
            storeCountLabel({
                store,
                unit: 'user'
            }),
            storeFilterField({
                store,
                fields: ['displayName', 'roles']
            })
        );
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
