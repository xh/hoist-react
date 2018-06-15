/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {vbox, frame, div, hspacer} from '@xh/hoist/cmp/layout';
import {listItem} from '@xh/hoist/kit/onsen';
import {mask} from '@xh/hoist/mobile/cmp/mask';

/**
 * Menu Component
 */
@HoistComponent()
class Menu extends Component {
    render() {
        const {model} = this,
            {isOpen, xPos, yPos} = model,
            {width} = this.props;

        if (!isOpen) return null;

        const items = model.items.map((it, idx) => {
            return this.renderItem(it, idx);
        });

        return frame(
            mask({
                isDisplayed: true,
                onClick: () => model.close()
            }),
            vbox({
                cls: 'xh-menu',
                width: width,
                style: {left: xPos, top: yPos},
                items: items
            })
        );
    }

    renderItem(item, idx) {
        const {icon, text, handler} = item,
            labelItems = icon ? [icon, hspacer(10), text] : [text];

        return listItem({
            key: idx,
            tappable: true,
            modifier: 'longdivider',
            items: [div({cls: 'center', items: labelItems})],
            onClick: () => {
                if (handler) handler();
                this.model.close();
            }
        });
    }
}

export const menu = elemFactory(Menu);