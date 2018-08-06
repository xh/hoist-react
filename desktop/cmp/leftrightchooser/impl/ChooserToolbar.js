/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {vspacer} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * A Toolbar for the LeftRightChooser.
 * @private
 */
@HoistComponent()
class ChooserToolbar extends Component {

    render() {
        const {model} = this,
            leftSel = model.leftModel.selModel,
            rightSel = model.rightModel.selModel;

        return toolbar({
            width: 50,
            vertical: true,
            className: 'xh-lr-chooser__toolbar',
            items: [
                vspacer(10),
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
