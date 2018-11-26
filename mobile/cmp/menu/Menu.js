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

/**
 * Menu Component
 */
@HoistComponent
export class Menu extends Component {

    static propTypes = {
        /** Width of the menu. */
        width: PT.number,

        /** How to interpret the provided xPos when showing. */
        align: PT.oneOf(['left', 'right']),

        // onClose: PT.func
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
                onClick: () => {
                    // onClose();
                    model.close();
                }
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
        const {text, icon, action, hidden, element} = itemModel,
            // labelItems = icon ? [icon, hspacer(10), text] : [text];
            item = element || formatText();
        return listItem({
            item,
            // item: div({className: 'center', items: labelItems}),
            key: idx,
            tappable: true,
            omit: hidden,
            onClick: () => {
                if (action) action();
                // this.model.close();
            }
        });

        function formatText() {
            const labelItems = icon ? [icon, hspacer(10), text] : [text];
            return div({className: 'center', items: labelItems});
        }
    }

}

export const menu = elemFactory(Menu);