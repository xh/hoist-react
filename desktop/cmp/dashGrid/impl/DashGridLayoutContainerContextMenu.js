/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

/**
 * Context menu to add items to a DashGridLayoutContainer
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their 'groupName' property
 *
 * @see DashGridLayoutContainerModel
 * @private
 */
export const dashGridLayoutContainerContextMenu = hoistCmp.factory({
    model: null,
    observer: null,
    render({dashGridLayoutContainerModel}) {
        const menuItems = createMenuItems({dashGridLayoutContainerModel});
        return contextMenu({menuItems});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems({dashGridLayoutContainerModel}) {
    const addMenuItems = createAddMenuItems({dashGridLayoutContainerModel});
    return [{
        text: 'Add',
        icon: Icon.add(),
        disabled: isEmpty(addMenuItems),
        items: addMenuItems
    }];
}

function createAddMenuItems({dashGridLayoutContainerModel}) {
    const groupedItems = {},
        ungroupedItems = [];

    const addToGroup = (item, groupName) => {
        const group = groupedItems[groupName];
        if (group) group.push(item);
        else groupedItems[groupName] = [item];
    };

    dashGridLayoutContainerModel.viewSpecs
        .filter(viewSpec => viewSpec.allowAdd &&
            (!viewSpec.unique ||
                !(dashGridLayoutContainerModel.getItemsBySpecId(viewSpec.id).length)))
        .forEach(viewSpec => {
            const {title, icon, groupName, id} = viewSpec,
                item = {
                    text: title,
                    icon: icon,
                    actionFn: () => dashGridLayoutContainerModel
                        .addView(id, dashGridLayoutContainerModel.nextPosition)
                };
            if (groupName) addToGroup(item, groupName);
            else ungroupedItems.push(item);
        });


    return [
        ...Object.keys(groupedItems)
            .map(group => {
                // If we have any ungrouped root items (i.e. in a 'mixed mode'),
                // insert a hidden icon to align the item text.
                const icon = ungroupedItems.length ? Icon.angleRight({style: {visibility: 'hidden'}}) : undefined,
                    text = group,
                    items = groupedItems[group];
                return {icon, text, items};
            }),
        ...ungroupedItems];
}

