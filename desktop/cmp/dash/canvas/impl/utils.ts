/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Icon} from '@xh/hoist/icon';
import {DashCanvasModel} from '../DashCanvasModel';

/**
 * Used to create view menu items (for adding or replacing views)
 * @internal
 */
export function createViewMenuItems({
    dashCanvasModel,
    position = null,
    viewId = null,
    replaceExisting = false
}) {
    if (!dashCanvasModel.ref.current) return [];

    const groupedItems = {},
        ungroupedItems = [],
        x = position?.x ?? 0,
        y = position?.y ?? 0,
        addPosition = !viewId ? calcAddPosition(x, y, dashCanvasModel) : null;

    const addToGroup = (item, groupName) => {
        const group = groupedItems[groupName];
        if (group) {
            group.push(item);
        } else {
            groupedItems[groupName] = [item];
        }
    };

    dashCanvasModel.viewSpecs
        .filter(viewSpec => {
            return (
                viewSpec.allowAdd &&
                (!viewSpec.unique || !dashCanvasModel.getViewsBySpecId(viewSpec.id).length)
            );
        })
        .forEach(viewSpec => {
            const {title, icon, groupName, id} = viewSpec,
                item = {
                    text: title,
                    icon: icon,
                    actionFn: () => {
                        if (replaceExisting) {
                            dashCanvasModel.replaceView(viewId, id);
                        } else {
                            dashCanvasModel
                                .addViewInternal(id, {layout: addPosition, previousViewId: viewId})
                                .ensureVisible();
                        }
                    }
                };

            if (groupName) {
                addToGroup(item, groupName);
            } else {
                ungroupedItems.push(item);
            }
        });

    return [
        ...Object.keys(groupedItems).map(group => {
            // If we have any ungrouped root items (i.e. in a 'mixed mode'),
            // insert a hidden icon to align the item text.
            const icon = ungroupedItems.length
                    ? Icon.angleRight({style: {visibility: 'hidden'}})
                    : undefined,
                text = group,
                items = groupedItems[group];
            return {icon, text, items};
        }),
        ...ungroupedItems
    ];
}

/**
 * Used to set the `{x, y}` position for the next added item based on the mouse location when a
 * context menu is triggered
 * @param x - clientX position
 * @param y - clientY position
 * @param dashCanvasModel - backing model
 */
const calcAddPosition = (x: number, y: number, dashCanvasModel: DashCanvasModel) => {
    const calcXY = (positionParams, top, left, w = 0, h = 0) => {
        const calcGridColWidth = positionParams => {
            const {margin, containerPadding, containerWidth, cols} = positionParams;
            return (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols;
        };

        const clamp = (num, lowerBound, upperBound) =>
            Math.max(Math.min(num, upperBound), lowerBound);

        const {margin, cols, rowHeight, maxRows} = positionParams;
        const colWidth = calcGridColWidth(positionParams);
        let x = Math.floor((left - margin[0]) / (colWidth + margin[0]));
        let y = Math.floor((top - margin[1]) / (rowHeight + margin[1]));

        x = clamp(x, 0, cols - w);
        y = clamp(y, 0, maxRows - h);
        return {x, y};
    };

    const {margin, columns: cols, rowHeight, maxRows, ref, containerPadding} = dashCanvasModel,
        containerPosition = ref.current.getBoundingClientRect(),
        {left: containerLeft, top: containerTop, width: containerWidth} = containerPosition,
        positionParams = {
            margin,
            cols,
            rowHeight,
            maxRows,
            containerPadding: containerPadding ?? margin,
            containerWidth
        },
        left = x - containerLeft,
        top = y - containerTop;

    return calcXY(positionParams, top, left);
};
