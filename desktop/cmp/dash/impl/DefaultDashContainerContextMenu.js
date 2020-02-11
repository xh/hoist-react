/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {Icon} from '@xh/hoist/icon';

/**
 * Default menu for adding views to a DashContainer. Can be replaced via
 * DashContainerModel's `contextMenu` config.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their `groupName` property
 *
 * @see DashContainerModel
 * @private
 */
export const defaultDashContainerContextMenu = hoistCmp.factory({
    render(props) {
        const menuItems = createMenuItems(props);
        return contextMenu({menuItems});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems(props) {
    const {dashContainerModel, stack, viewModel, addIndex} = props,
        ret = [];

    // Option to remove item if clicked on a tab
    if (viewModel && viewModel.viewSpec.allowRemove) {
        const item = {
            text: `Close "${viewModel.title}"`,
            icon: Icon.cross(),
            actionFn: () => dashContainerModel.removeView(viewModel.id)
        };
        ret.push(item, '-');
    }

    // Convert available viewSpecs into menu items
    let hasUngrouped;
    dashContainerModel.viewSpecs.filter(viewSpec => {
        if (!viewSpec.allowAdd) return false;
        if (viewSpec.unique) {
            const instances = dashContainerModel.getItemsBySpecId(viewSpec.id);
            return !instances.length;
        }
        return true;
    }).forEach(viewSpec => {
        const {id, title, icon, groupName} = viewSpec,
            item = {
                text: title,
                icon: icon,
                actionFn: () => dashContainerModel.addView(id, stack, addIndex)
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