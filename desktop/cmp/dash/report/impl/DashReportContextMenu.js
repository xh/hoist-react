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
 * Context menu to add items to a DashReport
 *
 * Available view specs are listed in their defined order, optionally
 * grouped by their 'groupName' property
 *
 * @see DashReportModel
 * @private
 */
export const dashReportContextMenu = hoistCmp.factory({
    model: null,
    observer: null,
    render({dashReportModel, clickPosition}) {
        const menuItems = createMenuItems({dashReportModel, clickPosition});
        return contextMenu({menuItems});
    }
});

//---------------------------
// Implementation
//---------------------------
function createMenuItems({dashReportModel, clickPosition}) {
    const addMenuItems = createAddMenuItems({dashReportModel, clickPosition}),
        {extraMenuItems} = dashReportModel;
    return [
        {
            text: 'Add',
            icon: Icon.add(),
            disabled: isEmpty(addMenuItems),
            items: addMenuItems
        },
        ...(extraMenuItems ? ['-', ...extraMenuItems] : [])

    ];
}

function createAddMenuItems({dashReportModel, clickPosition}) {


    const groupedItems = {},
        ungroupedItems = [],
        {x, y} = clickPosition,
        addPosition = calcAddPosition(x, y, dashReportModel);

    const addToGroup = (item, groupName) => {
        const group = groupedItems[groupName];
        if (group) {
            group.push(item);
        } else {
            groupedItems[groupName] = [item];
        }
    };

    dashReportModel.viewSpecs
        .filter(viewSpec => {
            return viewSpec.allowAdd &&
                (
                    !viewSpec.unique ||
                    !(dashReportModel.getItemsBySpecId(viewSpec.id).length)
                );
        })
        .forEach(viewSpec => {
            const {title, icon, groupName, id} = viewSpec,
                item = {
                    text: title,
                    icon: icon,
                    actionFn: () => dashReportModel.addView(
                        id,
                        addPosition
                    )
                };

            if (groupName) {
                addToGroup(item, groupName);
            } else {
                ungroupedItems.push(item);
            }
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
        ...ungroupedItems
    ];
}

//------------------------
// Implementation
//------------------------
/**
 * Used to set the {x, y} position for the next added item based on the mouse location when
 * context menu is triggered
 * @param {number} x - clientX position
 * @param {number} y - clientY position
 * @param {DashReportModel}
 */
const calcAddPosition = (x, y, dashReportModel) => {
    const calcXY = (positionParams, top, left, w=0, h=0) => {
        const calcGridColWidth = (positionParams) => {
            const { margin, containerPadding, containerWidth, cols } = positionParams;
            return (
                (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
            );
        };

        const clamp = (num, lowerBound, upperBound) =>
            Math.max(Math.min(num, upperBound), lowerBound);

        const {margin, cols, rowHeight, maxRows} = positionParams;
        const colWidth = calcGridColWidth(positionParams);
        let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
        let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

        x = clamp(x, 0, cols - w);
        y = clamp(y, 0, maxRows - h);
        return { x, y };
    };

    const {margin, columns: cols, rowHeight, maxRows, ref, containerPadding} = dashReportModel,
        containerPosition = ref.current.getBoundingClientRect(),
        {left: containerLeft, top: containerTop, width: containerWidth} = containerPosition,
        positionParams = {margin, cols, rowHeight, maxRows,
            containerPadding: containerPadding ?? margin, containerWidth},
        left = x - containerLeft,
        top = y - containerTop;

    return calcXY(positionParams, top, left);
};
