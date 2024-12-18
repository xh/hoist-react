/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {placeholder, vbox, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {every, isEmpty} from 'lodash';
import {ManageDialogModel} from './ManageDialogModel';

export const viewMultiPanel = hoistCmp.factory<ManageDialogModel>({
    model: uses(() => ManageDialogModel),
    render({model}) {
        const views = model.selectedViews;
        if (isEmpty(views)) return null;

        return panel({
            item: vframe({
                className: 'xh-view-manager__manage-dialog__form',
                item: placeholder(
                    Icon.gears(),
                    `${views.length} selected ${pluralize(model.viewManagerModel.typeDisplayName)}`,
                    vspacer(),
                    buttons()
                )
            })
        });
    }
});

const buttons = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        const views = model.selectedViews,
            allEditable = every(views, 'isEditable'),
            allPinned = every(views, 'isPinned');

        return vbox({
            style: {gap: 10, alignItems: 'center'},
            items: [
                button({
                    text: allPinned ? 'Unpin from your Menu' : 'Pin to your Menu',
                    icon: Icon.pin({
                        prefix: allPinned ? 'fas' : 'far',
                        className: allPinned ? 'xh-yellow' : ''
                    }),
                    width: 200,
                    outlined: true,
                    onClick: () => model.togglePinned(views)
                }),
                button({
                    text: 'Delete',
                    icon: Icon.delete(),
                    width: 200,
                    outlined: true,
                    intent: 'danger',
                    omit: !allEditable,
                    onClick: () => model.deleteAsync(views)
                })
            ]
        });
    }
});
