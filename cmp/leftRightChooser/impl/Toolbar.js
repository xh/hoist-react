/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core/index';
import {toolbar} from 'hoist/cmp/index';
import {button} from 'hoist/kit/blueprint/index';
import {Icon} from 'hoist/icon/index';

/**
 * A Toolbar that contains controllers (buttons) for the LeftRightChooser
 */

@hoistComponent()
class Toolbar extends Component {

    render() {
        const {model} = this,
            {leftModel, rightModel} = model;

        return toolbar({
            width: 50,
            vertical: true,
            items: [
                button({
                    icon: Icon.chevronRight(),
                    onClick: () => model.moveSelected('right'),
                    disabled: !leftModel.selection.count
                }),
                button({
                    icon: Icon.chevronLeft(),
                    onClick: () => model.moveSelected('left'),
                    disabled: !rightModel.selection.count
                })
            ]
        });
    }

}

export const chooserToolbar = elemFactory(Toolbar);
