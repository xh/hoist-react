/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, type MenuItemLike} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {createViewSpecMenuItems} from '../../impl/DashUtils';
import {DashContainerModel} from '../DashContainerModel';

/**
 * Context menu for title bar/tabs of a stack in a DashContainer.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their `groupName` property into (nested) submenus.
 *
 * @internal
 */
export const dashContainerContextMenu = hoistCmp.factory({
    model: null,
    observer: null,
    render({contextMenuEvent, ...rest}) {
        const menuItems = createMenuItems(rest);
        return contextMenu({menuItems, context: {contextMenuEvent}});
    }
});

/**
 * 'Add View' menu button to display in an empty DashContainer.
 * @internal
 */
export const dashContainerAddViewButton = hoistCmp.factory<DashContainerModel>({
    render({model}) {
        const {viewState, addViewButtonText} = model,
            menuItems = createAddMenuItems({dashContainerModel: model, stack: viewState[0]});
        return popover({
            interactionKind: 'click',
            item: button({icon: Icon.add(), text: addViewButtonText}),
            content: contextMenu({menuItems})
        });
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems(props): MenuItemLike[] {
    const {dashContainerModel, viewModel} = props,
        {renameLocked} = dashContainerModel,
        ret = [];

    // Add context sensitive items if clicked on a tab
    if (viewModel) {
        const {id, viewSpec, refreshContextModel} = viewModel;
        ret.push(
            {
                text: 'Remove',
                icon: Icon.cross(),
                disabled: !viewSpec.allowRemove,
                actionFn: () => dashContainerModel.removeView(id)
            },
            {
                text: 'Rename',
                icon: Icon.edit(),
                hidden: renameLocked,
                disabled: !viewSpec.allowRename,
                actionFn: () => dashContainerModel.renameView(id)
            },
            {
                text: 'Refresh',
                icon: Icon.refresh(),
                hidden: !refreshContextModel.refreshTargets.length,
                actionFn: () => refreshContextModel.refreshAsync()
            },
            '-'
        );
    }

    const addMenuItems = createAddMenuItems(props);
    ret.push({
        text: 'Add',
        icon: Icon.add(),
        disabled: isEmpty(addMenuItems),
        items: addMenuItems
    });

    if (viewModel?.extraMenuItems) {
        ret.push('-');
        viewModel.extraMenuItems.forEach(it => ret.push(it));
    }

    if (dashContainerModel.extraMenuItems) {
        ret.push('-');
        dashContainerModel.extraMenuItems.forEach(it => ret.push(it));
    }

    return ret;
}

// Convert any available viewSpecs into menu items
function createAddMenuItems(props) {
    const {dashContainerModel, stack, index} = props;

    const addableSpecs = dashContainerModel.viewSpecs.filter(viewSpec => {
        if (!viewSpec.allowAdd) return false;
        if (viewSpec.unique) {
            const instances = dashContainerModel.getItemsBySpecId(viewSpec.id);
            return !instances.length;
        }
        return true;
    });

    return createViewSpecMenuItems(addableSpecs, ({id, title, icon}) => ({
        text: title,
        icon: icon,
        actionFn: () => dashContainerModel.addView(id, stack, index + 1)
    }));
}
