/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {vbox, frame, div, hspacer} from '@xh/hoist/layout';
import {listItem} from '@xh/hoist/mobile/onsen';
import {mask} from '@xh/hoist/mobile/cmp/mask';

/**
 * Menu Component
 */
@HoistComponent()
class Menu extends Component {

    static propTypes = {
        /** the width of the menu */
        width: PT.number,
        /** how to interpret the provided xPos when showing */
        align: PT.oneOf(['left', 'right'])
    };

    render() {
        const {model} = this,
            {isOpen, xPos, yPos} = model,
            {width, align = 'left'} = this.props,
            style = {};

        if (!isOpen) return null;

        const items = model.items.map((it, idx) => {
            return this.renderItem(it, idx);
        });

        style.top = yPos;
        style[align] = xPos;

        return frame(
            mask({
                isDisplayed: true,
                onClick: () => model.close()
            }),
            vbox({
                cls: 'xh-menu',
                width,
                style,
                items
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