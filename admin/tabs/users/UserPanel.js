/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler} from 'hoist/layout';
import {panel, refreshButton, storeCountLabel, storeFilterField, toolbar} from 'hoist/cmp';

import {UserModel} from './UserModel';

@HoistComponent()
export class UserPanel extends Component {

    localModel = new UserModel();

    render() {
        return panel({
            topToolbar: this.renderToolbar(),
            item: grid({
                model: this.model.gridModel,
                gridOptions: {
                    rowSelection: 'single'
                }
            })
        });
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
