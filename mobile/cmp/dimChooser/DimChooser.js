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

import {menuButton} from '@xh/hoist/mobile/cmp/button';
import {menu, MenuModel} from '@xh/hoist/mobile/cmp/menu';

/**
 * Menu Component
 */
@HoistComponent
export class DimChooser extends Component {

    static propTypes = {
        // /** How to interpret the provided xPos when showing. */
        // align: PT.oneOf(['left', 'right'])
        xPos: PT.number,
        yPos: PT.number
    };

    render() {
        const {model, props} = this;

        return div(
            this.renderDimMenu(),
            menuButton({
                model,
                width: 200,
                align: 'left',
                style: {color: 'black'}
            })
        )
    }

    renderDimMenu = () => {
        const {model} = this;
        if (!model) return null;
        return menu({
            model,
            width: 260,
            align: 'left'
        });
    }
}

export const dimChooser = elemFactory(DimChooser);