/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {menu, menuItem, menuDivider} from '@xh/hoist/kit/blueprint';
import {size, forOwn} from 'lodash';

/**
 * Default menu for adding views to a DashContainer. Can be replaced via
 * DashContainerModel's `addViewContent` config.
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their `groupName` at the top.
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
    const groups = {},
        ret = [];

    // Convert available viewSpecs into menu items
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
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(item);
        } else {
            ret.push(item);
        }
    });

    // Insert groups as nested menu items
    if (size(groups)) ret.unshift(menuDivider());
    forOwn(groups, (items, text) => {
        ret.unshift(menuItem({
            text,
            items
        }));
    });

    return ret;
}