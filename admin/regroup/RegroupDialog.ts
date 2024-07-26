/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';

import {RegroupDialogModel} from './RegroupDialogModel';

export const regroupDialog = hoistCmp.factory({
    model: uses(RegroupDialogModel),

    render({model}) {
        const {isOpen} = model;
        if (!isOpen) return null;

        return dialog({
            title: 'Change Group',
            icon: Icon.folder(),
            style: {width: 300},
            isOpen: true,
            isCloseButtonShown: false,
            items: [
                dialogBody(
                    select({
                        bind: 'groupName',
                        enableCreate: true,
                        options: model.options,
                        width: 260
                    })
                ),
                tbar()
            ]
        });
    }
});

const tbar = hoistCmp.factory<RegroupDialogModel>(({model}) => {
    return toolbar(
        filler(),
        button({
            text: 'Cancel',
            onClick: () => model.close()
        }),
        button({
            text: 'Save',
            icon: Icon.check(),
            intent: 'success',
            disabled: model.groupName == null,
            onClick: () => model.saveAsync()
        })
    );
});
