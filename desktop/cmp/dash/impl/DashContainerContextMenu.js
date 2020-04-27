/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {Icon} from '@xh/hoist/icon';
import {menuDivider} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';

/**
 * Context menu for title bar/tabs of a stack in a DashContainer.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their `groupName` property
 *
 * @see DashContainerModel
 * @private
 */
export const dashContainerContextMenu = hoistCmp.factory({
    model: null, observable: null,
    render(props) {
        const menuItems = createMenuItems(props);
        return contextMenu({menuItems});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems(props) {
    const {dashContainerModel, viewModel} = props,
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
                hidden: !viewSpec.allowRename,
                actionFn: () => dashContainerModel.renameView(id)
            },
            {
                text: 'Refresh',
                icon: Icon.refresh(),
                hidden: !refreshContextModel.refreshTargets.length,
                actionFn: () => refreshContextModel.refreshAsync()
            }
        );
    }
    const addMenuItems = createAddMenuItems(props);
    if (!isEmpty(addMenuItems)) {
        ret.push(
            menuDivider({title: 'Add'}),
            ...addMenuItems
        );
    } else {
        ret.push(
            '-',
            {text: 'No available views to add', disabled: true}
        );
    }

    return ret;
}

// Convert any available viewSpecs into menu items
function createAddMenuItems(props) {
    let {dashContainerModel, stack, index} = props,
        ret = [];

    const addableSpecs = dashContainerModel.viewSpecs.filter(viewSpec => {
        if (!viewSpec.allowAdd) return false;
        if (viewSpec.unique) {
            const instances = dashContainerModel.getItemsBySpecId(viewSpec.id);
            return !instances.length;
        }
        return true;
    });

    if (isEmpty(addableSpecs)) return [];

    let hasUngrouped;
    addableSpecs.forEach(viewSpec => {
        const {id, title, icon, groupName} = viewSpec,
            item = {
                text: title,
                icon: icon,
                actionFn: () => dashContainerModel.addView(id, stack, index + 1)
            };

        // Group if necessary
        if (groupName) {
            let groupSpec = ret.find(it => it.groupName === groupName);
            if (!groupSpec) {
                groupSpec = {groupName, text: groupName, items: []};
                ret.push(groupSpec);
            }
            groupSpec.items.push(item);
        } else {
            ret.push(item);
            hasUngrouped = true;
        }
    });

    // Convert groups into nested menu items
    return ret.map(item => {
        if (!item.groupName) return item;

        // If we have any ungrouped root items (i.e. in a 'mixed mode'),
        // insert a hidden icon to align the item text.
        const icon = hasUngrouped ? Icon.angleRight({style: {visibility: 'hidden'}}) : undefined,
            {text, items} = item;

        return {icon, text, items};
    });
}