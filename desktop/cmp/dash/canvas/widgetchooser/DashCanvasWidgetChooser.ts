/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {uniqBy} from 'lodash';
import classNames from 'classnames';
import type {ReactElement} from 'react';
import {card} from '@xh/hoist/cmp/card';
import {div, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, TestSupportProps, uses} from '@xh/hoist/core';
import {DashCanvasModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {DashCanvasWidgetChooserModel} from '@xh/hoist/desktop/cmp/dash/canvas/widgetchooser/DashCanvasWidgetChooserModel';

import './DashCanvasWidgetChooser.scss';

export interface DashCanvasWidgetChooserProps extends HoistProps, TestSupportProps {
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
export const [DashCanvasWidgetChooser, dashCanvasWidgetChooser] =
    hoistCmp.withFactory<DashCanvasWidgetChooserProps>({
        displayName: 'DashCanvasWidgetChooser',
        model: creates(DashCanvasWidgetChooserModel),
        className: 'xh-dash-canvas-widget-chooser',
        render({dashCanvasModel, className, testId}) {
            if (!dashCanvasModel) return;

            const classes = [];

            return vframe({
                className: classNames(className, classes),
                overflowY: 'auto',
                flexWrap: 'nowrap',
                items: createDraggableItems(dashCanvasModel),
                testId
            });
        }
    });

//---------------------------
// Implementation
//---------------------------
const draggableWidget = hoistCmp.factory<DashCanvasWidgetChooserModel>({
    displayName: 'DraggableWidget',
    model: uses(DashCanvasWidgetChooserModel),
    render({model, viewSpec}) {
        const {id, icon, title} = viewSpec as DashCanvasViewSpec;
        return div({
            id: `draggableFor-${id}`,
            className: 'xh-dash-canvas-widget-chooser__draggable-widget',
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
            const title = group,
                items = groupedItems[group],
                sameIcons =
                    uniqBy<{item: ReactElement; icon: ReactElement}>(
                        items,
                        it => it.icon.props.iconName
                    ).length === 1,
                icon = sameIcons ? items[0].icon : null;

            return card({
                icon,
                title,
                items: items.map(it => it.item),
                modelConfig: {collapsible: true}
            });
        }),
        ...ungroupedItems
    ];
}
