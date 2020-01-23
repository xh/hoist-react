/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {menu, menuItem} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';

/**
 * Default menu for adding views to a DashContainer. Can be replaced via
 * DashContainerModel's `addViewContent` config.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their `groupName` property
 *
 * @see DashContainerModel
 * @private
 */
export const addViewMenu = hoistCmp.factory({
    render({dashContainerModel, stack}) {
        const menuItems = createMenuItems(dashContainerModel, stack);
        return menu(menuItems);
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems(dashContainerModel, stack) {
    const ret = [];

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
            item = menuItem({
                text: title,
                icon: icon,
                onClick: () => dashContainerModel.addView(id, stack)
            });

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

        return menuItem({icon, text, items});
    });
}