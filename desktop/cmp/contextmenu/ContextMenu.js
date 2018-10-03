/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory} from '@xh/hoist/core';
import {start} from '@xh/hoist/promise';
import {menuDivider, menuItem, menu} from '@xh/hoist/kit/blueprint';
import {isReactElement} from '@xh/hoist/utils/react';

import {ContextMenuItem} from './ContextMenuItem';

/**
 * ContextMenu
 *
 * Not typically used directly by applications.  To add a Context Menu to a
 * component, decorate the component with ContextMenuSupport and implement
 * getContextMenuItems().
 *
 * @see StoreContextMenu to specify a context menu on store enabled components.
 * That API will receive specific information about the current selection
 */
export class ContextMenu extends Component {

    static propTypes = {
        /**
         *  Array of ContextMenuItems, configs to create them, Elements, or '-' (divider).
         */
        menuItems: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.element])).isRequired
    }

    render() {
        return menu(this.parseMenuItems(this.props.menuItems));
    }

    //---------------------------
    // Implementation
    //---------------------------
    parseMenuItems(items) {
        items = items.map(item => {
            if (item === '-' || isReactElement(item)) return item;

            if (!(item instanceof ContextMenuItem)) {
                item = new ContextMenuItem(item);
            }
            if (item.prepareFn) item.prepareFn(item);
            return item;
        });

        return items.filter(it => {
            return !it.hidden;
        }).filter((it, idx, arr) => {
            if (it === '-') {
                // Remove starting / ending separators
                if (idx == 0 || idx == (arr.length - 1)) return false;

                // Remove consecutive separators
                const prev = idx > 0 ? arr[idx - 1] : null;
                if (prev === '-') return false;
            }
            return true;
        }).map(item => {
            if (item === '-') return menuDivider();
            if (isReactElement(item)) {
                return menuItem({text: item});
            }
            
            const items = item.items ? this.parseMenuItems(item.items) : null;
            return menuItem({
                text: item.text,
                icon: item.icon,
                onClick: item.actionFn ? () => start(item.actionFn) : null,    // do async to allow menu to close
                disabled: item.disabled,
                items
            });
        });
    }
}
export const contextMenu = elemFactory(ContextMenu);