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
 * A Toolbar for the LeftRightChooser.
 */
@hoistComponent()
class ChooserToolbar extends Component {

    render() {
        const {model} = this,
            leftSel = model.leftModel.selection,
            rightSel = model.rightModel.selection;

        return toolbar({
            width: 50,
            vertical: true,
            items: [
                button({
                    icon: Icon.chevronRight(),
                    onClick: () => model.moveRows(leftSel.records),
                    disabled: leftSel.isEmpty
                }),
                button({
                    icon: Icon.chevronLeft(),
                    onClick: () => model.moveRows(rightSel.records),
                    disabled: rightSel.isEmpty
                })
            ]
        });
    }
}
export const chooserToolbar = elemFactory(ChooserToolbar);
