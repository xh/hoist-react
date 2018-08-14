/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';

import {hbox, vbox} from '@xh/hoist/cmp/layout';

import './Collapser.scss';

/**
 * @private
 */
@HoistComponent()
export class Collapser extends Component {
    
    render() {
        const {vertical} = this.model;

        const cmp = vertical ? hbox : vbox,
            cfg = {
                className: `xh-resizable-collapser ${vertical ? 'vertical' : 'horizontal'}`,
                item: button({
                    className: 'xh-resizable-collapser-btn',
                    icon: Icon[this.getChevron()](),
                    onClick: this.onClick
                })
            };

        return cmp(cfg);
    }

    getChevron() {
        const {vertical, collapsed, contentFirst} = this.model,
            directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
            idx = (contentFirst != collapsed ? 0 : 1);

        return directions[idx];
    }

    onClick = () => {
        this.model.toggleCollapsed();
    }
}
export const collapser = elemFactory(Collapser);