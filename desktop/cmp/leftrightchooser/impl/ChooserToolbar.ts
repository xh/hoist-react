/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LeftRightChooserModel} from '../LeftRightChooserModel';

/** @internal */
export const chooserToolbar = hoistCmp.factory<LeftRightChooserModel>(({model}) => {
    const leftSel = model.leftModel.selModel,
        rightSel = model.rightModel.selModel;

    return toolbar({
        width: 50,
        vertical: true,
        className: 'xh-lr-chooser__toolbar',
        items: [
            vspacer(10),
            button({
                icon: Icon.chevronRight(),
                onClick: () => model.moveRows(leftSel.selectedRecords),
                disabled:
                    model.readonly ||
                    leftSel.isEmpty ||
                    leftSel.selectedRecords.every(it => it.data.locked)
            }),
            button({
                icon: Icon.chevronLeft(),
                onClick: () => model.moveRows(rightSel.selectedRecords),
                disabled:
                    model.readonly ||
                    rightSel.isEmpty ||
                    rightSel.selectedRecords.every(it => it.data.locked)
            })
        ]
    });
});
