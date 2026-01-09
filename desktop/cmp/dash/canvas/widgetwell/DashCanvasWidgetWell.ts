/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {uniqBy} from 'lodash';
import classNames from 'classnames';
import type {ReactElement} from 'react';
import {div, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {DashCanvasModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {DashCanvasWidgetWellModel} from '@xh/hoist/desktop/cmp/dash/canvas/widgetwell/DashCanvasWidgetWellModel';
import {collapsibleBox} from '@xh/hoist/desktop/cmp/form/CollapsibleBox';

import './DashCanvasWidgetWell.scss';

export interface DashCanvasWidgetWellProps extends HoistProps {
    /** DashCanvasModel for which this widget well should allow the user to add views from. */
    dashCanvasModel?: DashCanvasModel;
}

/**
 * Widget Well from which to add items to a DashCanvas by drag-and-drop.
 *
 * Available view specs are listed in their defined order,
 * grouped by their 'groupName' property if present.
 *
 * Typically, an app developer would place this inside a collapsible panel to the side of
 * a DashCanvas.
 */
export const [DashCanvasWidgetWell, dashCanvasWidgetWell] =
    hoistCmp.withFactory<DashCanvasWidgetWellProps>({
        displayName: 'DashCanvasWidgetWell',
        model: creates(DashCanvasWidgetWellModel),
        className: 'xh-dash-canvas-widget-well',
        render({dashCanvasModel, className}) {
            if (!dashCanvasModel) return;

            return vframe({
                className: classNames(className),
                overflow: 'auto',
                items: createDraggableItems(dashCanvasModel)
            });
        }
    });

//---------------------------
// Implementation
//---------------------------
const draggableWidget = hoistCmp.factory<DashCanvasWidgetWellModel>({
    displayName: 'DraggableWidget',
    model: uses(DashCanvasWidgetWellModel),
    render({model, viewSpec}) {
        const {id, icon, title} = viewSpec as DashCanvasViewSpec;
        return div({
            id: `draggableFor-${id}`,
            className: 'xh-dash-canvas-draggable-widget',
            draggable: true,
            unselectable: 'on',
            onDragStart: e => model.onDragStart(e),
            onDragEnd: e => model.onDragEnd(e),
            items: [icon, ' ', title]
        });
    }
});

/**
 * Used to create draggable items (for adding views)
 * @internal
 */
function createDraggableItems(dashCanvasModel: DashCanvasModel): any[] {
    if (!dashCanvasModel.ref.current) return [];

    const groupedItems = {},
        ungroupedItems = [];

    const addToGroup = (item, icon, groupName) => {
        const group = groupedItems[groupName];
        if (group) {
            group.push({item, icon});
        } else {
            groupedItems[groupName] = [{item, icon}];
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
            const {groupName} = viewSpec,
                item = draggableWidget({viewSpec});

            if (groupName) {
                addToGroup(item, viewSpec.icon, groupName);
            } else {
                ungroupedItems.push(item);
            }
        });

    return [
        ...Object.keys(groupedItems).map(group => {
            const label = group,
                items = groupedItems[group],
                sameIcons =
                    uniqBy<{item: ReactElement; icon: ReactElement}>(
                        items,
                        it => it.icon.props.iconName
                    ).length === 1,
                icon = sameIcons ? items[0].icon : null;

            return collapsibleBox({
                icon,
                collapsed: false,
                label,
                items: items.map(it => it.item)
            });
        }),
        ...ungroupedItems
    ];
}
