/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist/react';
import {start} from 'hoist/promise';
import {menuDivider, menuItem, menu} from 'hoist/kit/blueprint';

export class ContextMenu extends Component {

    render() {
        const items = this.model.items.map(it => {
            return it === '-' ?
                menuDivider() :
                menuItem({
                    text: it.text,
                    icon: it.icon,
                    onClick: () => start(it.fn)    // do async to allow menu to close
                });
        });
        return menu(items);
    }

    get model() {
        return this.props.model;
    }
}
export const contextMenu = elemFactory(ContextMenu);