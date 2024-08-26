/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RecategorizeDialogModel} from '@xh/hoist/admin/tabs/userData/roles/recategorize/RecategorizeDialogModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';

export const recategorizeDialog = hoistCmp.factory({
    model: uses(RecategorizeDialogModel),

    render({model}) {
        const {isOpen, savingTask} = model;
        if (!isOpen) return null;

        return dialog({
            title: `Change Category (${model.selectedRecords.length} roles)`,
            icon: Icon.folder(),
            style: {width: 300},
            isOpen: true,
            isCloseButtonShown: false,
            item: panel({
                mask: savingTask,
                item: dialogBody(
                    select({
                        autoFocus: true,
                        bind: 'categoryName',
                        enableCreate: true,
                        options: model.options,
                        width: 260
                    })
                ),
                bbar: bbar()
            })
        });
    }
});

const bbar = hoistCmp.factory<RecategorizeDialogModel>(({model}) => {
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
            disabled: model.categoryName == null,
            onClick: () => model.saveAsync()
        })
    );
});
