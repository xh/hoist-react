/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
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
 *
 * @see DashCanvasModel
 * @private
 */
export const dashCanvasContextMenu = hoistCmp.factory({
    model: null,
    observer: null,
    render({dashCanvasModel, clickPosition}) {
        const menuItems = createMenuItems({dashCanvasModel, clickPosition});
        return contextMenu({menuItems});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems({dashCanvasModel, clickPosition}) {
    const addMenuItems = createViewMenuItems({dashCanvasModel, clickPosition}),
        {extraMenuItems, contentLocked} = dashCanvasModel;
    return [
        {
            text: 'Add',
            icon: Icon.add(),
            disabled: contentLocked || isEmpty(addMenuItems),
            items: addMenuItems
        },
        '-',
        ...(extraMenuItems ?? [])

    ];
}