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
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {switchInput} from '@xh/hoist/desktop/cmp/form';

import {UserModel} from './UserModel';

@HoistComponent
export class UserPanel extends Component {

    localModel = new UserModel();

    render() {
        return panel({
            tbar: this.renderToolbar(),
            item: grid({
                model: this.model.gridModel
            })
        });
    }

    renderToolbar() {
        const {model} = this,
            {gridModel} = model;
        return toolbar(
            switchInput({
                model,
                field: 'activeOnly',
                label: 'Active only'
            }),
            filler(),
            storeCountLabel({gridModel, unit: 'user'}),
            storeFilterField({gridModel})
        );
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
