/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

/**
 * Context menu to add items to a DashCanvas
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their 'groupName' property
 * @internal
 */
export const dashCanvasContextMenu = hoistCmp.factory({
    model: null,
    observer: null,
    render({dashCanvasModel, position, contextMenuEvent}) {
        const menuItems = createMenuItems({dashCanvasModel, position});
        return contextMenu({menuItems, contextMenuEvent});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems({dashCanvasModel, position}) {
    const addMenuItems = createViewMenuItems({dashCanvasModel, position}),
        {extraMenuItems, contentLocked, refreshContextModel} = dashCanvasModel;
    return [
        {
            text: 'Add',
            icon: Icon.add(),
            hidden: contentLocked || isEmpty(addMenuItems),
            items: addMenuItems
        },
        {
            text: 'Refresh',
            icon: Icon.refresh(),
            hidden: !refreshContextModel.refreshTargets.length,
            actionFn: () => refreshContextModel.refreshAsync()
        },
        '-',
        ...(extraMenuItems ?? [])
    ];
}
