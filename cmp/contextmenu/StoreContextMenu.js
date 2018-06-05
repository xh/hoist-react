/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {StoreContextMenuItem} from './StoreContextMenuItem';
import {Icon} from '@xh/hoist/icon';

/**
 * Model for ContextMenu on stores.
 */
export class StoreContextMenu {

    items = [];
    gridModel = null;

    /**
     * @param {Object[]} items - collection of StoreContextMenuItems, configs to create them, or Strings.
     *      If a String, value can be '-' for a separator, a hoist token, or a token for a native AG Grid menu item.
     *      Hoist tokens are:
     *          'colChooser' - Provides a column chooser for a grid, requires a gridModel
     * @param {Object} [parent] - an optional model to bind to this contextMenu, used to control implementation of menu items
     */
    constructor({items, gridModel}) {
        this.gridModel = gridModel;
        this.items = items.map(it => {
            if (isString(it)) return this.parseToken(it);
            if (it instanceof StoreContextMenuItem) return it;
            return new StoreContextMenuItem(it);
        });
    }

    parseToken(token) {
        switch (token) {
            case 'colChooser':
                var {colChooserModel} = this.gridModel;
                return new StoreContextMenuItem({
                    text: 'Columns...',
                    icon: Icon.grid(),
                    hidden: !colChooserModel,
                    action: () => {
                        colChooserModel.open();
                    }
                });
            default:
                return token;
        }
    }
}