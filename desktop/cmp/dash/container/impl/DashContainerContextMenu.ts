/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {
    baseUiMenuButton,
    type BaseUiMenuItemLike
} from '@xh/hoist/desktop/cmp/menu/impl/BaseUiMenu';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import {createViewSpecMenuItems} from '../../impl/DashUtils';
import {DashContainerModel} from '../DashContainerModel';

/**
 * Items for the menu of the title bar/tabs of a stack in a DashContainer, shown on right-click
 * and from the stack's menu button.
 *
 * Available view specs are listed in their defined order, optionally grouped by their `groupName`
 * property into (nested) submenus, with a filter to find them.
 *
 * @internal
 */
export function createDashContainerMenuItems(props): BaseUiMenuItemLike[] {
    const {dashContainerModel, viewModel} = props,
        {renameLocked} = dashContainerModel,
        ret: BaseUiMenuItemLike[] = [];

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
        items: addMenuItems,
        filterable: true
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

/**
 * 'Add View' menu button to display in an empty DashContainer.
 * @internal
 */
export const dashContainerAddViewButton = hoistCmp.factory<DashContainerModel>({
    render({model}) {
        const {viewState, addViewButtonText} = model,
            menuItems = createAddMenuItems({dashContainerModel: model, stack: viewState[0]});
        return baseUiMenuButton({
            icon: Icon.add(),
            text: addViewButtonText,
            menuItems,
            filterable: true
        });
    }
});

//---------------------------
// Implementation
//---------------------------
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
