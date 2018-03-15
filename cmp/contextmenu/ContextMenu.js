/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist/core';
import {start} from 'hoist/promise';
import {menuDivider, menuItem, menu} from 'hoist/kit/blueprint';
import {isReactElement} from 'hoist/utils/ReactUtils';


import {ContextMenuItem} from './ContextMenuItem';

/**
 * ContextMenu
 *
 * This object can be used to specify context menus on any HoistComponent.
 * To add a ContextMenu to a component, specify a renderContextMenu() method on the component.
 *
 * See GridContextMenu to specify a context menu on a grid.  That API will receive grid specific
 * information about rows and cells, and will provide grid specific built-in menu items.
 */
export class ContextMenu extends Component {

    /**
     * This element expects the following properties
     * @props items, Array of ContextMenuItems, configs to create them, React Elements,  or '-' to represent a divider
     */
    render() {
        return menu(this.parseMenuItems(this.props.menuItems));
    }

    //---------------------------
    // Implementation
    //---------------------------
    parseMenuItems(items) {
        items = items.map(it => {
            if (it instanceof ContextMenuItem || '-') return it;
            return new ContextMenuItem(it);
        });

        return items.map(item => {
            if (item === '-') return menuDivider();
            if (isReactElement(item))  return item;

            const items = item.items ? this.parseMenuItems(item.items) : null;

            return menuItem({
                text: item.text,
                icon: item.icon,
                onClick: () => start(item.action),    // do async to allow menu to close
                disabled: item.disabled,
                items
            });
        });
    }
}
export const contextMenu = elemFactory(ContextMenu);