/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {
    type BaseUiMenuItemLike,
    showBaseUiContextMenu
} from '@xh/hoist/desktop/cmp/menu/impl/BaseUiMenu';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import type {MouseEvent} from 'react';
import type {DashCanvasModel} from '../DashCanvasModel';

/**
 * Show the context menu to add items to a DashCanvas, at the cursor.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their 'groupName' property, with a filter to find them.
 * @internal
 */
export function showDashCanvasContextMenu({
    dashCanvasModel,
    position,
    contextMenuEvent
}: {
    dashCanvasModel: DashCanvasModel;
    position: {x: number; y: number};
    contextMenuEvent: MouseEvent;
}) {
    const {clientX, clientY} = contextMenuEvent;
    showBaseUiContextMenu(
        createMenuItems({dashCanvasModel, position}),
        {left: clientX, top: clientY},
        {context: {contextMenuEvent}}
    );
}

//---------------------------
// Implementation
//---------------------------
function createMenuItems({dashCanvasModel, position}): BaseUiMenuItemLike[] {
    const addMenuItems = createViewMenuItems({dashCanvasModel, position}),
        {extraMenuItems, contentLocked, refreshContextModel} = dashCanvasModel;
    return [
        {
            text: 'Add',
            icon: Icon.add(),
            hidden: contentLocked || isEmpty(addMenuItems),
            items: addMenuItems,
            filterable: true
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
