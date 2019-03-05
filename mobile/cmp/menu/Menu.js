/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import PT from 'prop-types';
import {vbox, fragment, div, hspacer} from '@xh/hoist/cmp/layout';
import {listItem} from '@xh/hoist/kit/onsen';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {MenuModel} from '@xh/hoist/mobile/cmp/menu/MenuModel';

import './Menu.scss';

/**
 * Menu Component
 */
@HoistComponent
export class Menu extends Component {

    static modelClass = MenuModel;

    static propTypes = {
        /** Width of the menu. */
        width: PT.number,

        /** How to interpret the provided xPos when showing. */
        align: PT.oneOf(['left', 'right'])
    };

    render() {
        const {model} = this,
            {isOpen, xPos, yPos} = model,
            {width, align = 'left'} = this.props,
            style = {};

        if (!isOpen) return null;

        const items = model.itemModels.map((it, idx) => {
            if (it.prepareFn) it.prepareFn(it);
            return this.renderItem(it, idx);
        });

        style.top = yPos;
        style[align] = xPos;

        return fragment(
            mask({
                isDisplayed: true,
                onClick: () => model.close()
            }),
            vbox({
                className: 'xh-menu',
                width,
                style,
                items
            })
        );
    }

    renderItem(itemModel, idx) {
        const {text, icon, action, hidden} = itemModel,
            labelItems = icon ? [icon, hspacer(10), text] : [text];

        return listItem({
            key: idx,
            tappable: true,
            item: div({className: 'center', items: labelItems}),
            omit: hidden,
            onClick: () => {
                if (action) action();
                this.model.close();
            }
        });
    }
}

export const menu = elemFactory(Menu);