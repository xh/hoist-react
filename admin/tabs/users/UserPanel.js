/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {hoistComponent} from 'hoist/core';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {vframe, filler} from 'hoist/layout';
import {label, storeFilterField, toolbar} from 'hoist/cmp';
import {UrlStore} from 'hoist/data';
import {Icon} from 'hoist/icon';

import {usernameCol} from '../../columns/Columns';

@hoistComponent()
export class UserPanel extends Component {

    gridModel = new GridModel({
        store: new UrlStore({
            url: 'userAdmin',
            fields: ['username', 'email', 'displayName', 'active', 'roles']
        }),
        columns: [
            usernameCol({fixedWidth: 175}),
            baseCol({field: 'email', fixedWidth: 175}),
            baseCol({field: 'displayName', fixedWidth: 150}),
            boolCheckCol({field: 'active', fixedWidth: 75}),
            baseCol({field: 'roles', minWidth: 130, flex: 1})
        ]
    });

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.gridModel})
        );
    }

    renderToolbar() {
        return toolbar({
            items: [
                button({icon: Icon.sync(), onClick: this.onRefreshClick}),
                filler(),
                this.renderUserCount(),
                storeFilterField({store: this.gridModel.store, fields: ['displayName', 'roles']})
            ]
        });
    }

    onRefreshClick = () => {
        return this.loadAsync();
    }

    renderUserCount() {
        const count = this.gridModel.store.count;
        return label(`${count} User${count === 1 ? '' : 's'}`);
    }

    async loadAsync() {
        return this.gridModel.store.loadAsync();
    }
}
