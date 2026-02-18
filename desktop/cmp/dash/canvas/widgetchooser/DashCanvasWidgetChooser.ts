/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {card} from '@xh/hoist/cmp/card';
import {div, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, TestSupportProps, uses} from '@xh/hoist/core';
import {DashCanvasModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {DashCanvasWidgetChooserModel} from '@xh/hoist/desktop/cmp/dash/canvas/widgetchooser/DashCanvasWidgetChooserModel';
import {every} from 'lodash';
import type {ReactElement, ReactNode} from 'react';
import './DashCanvasWidgetChooser.scss';

export interface DashCanvasWidgetChooserProps extends HoistProps, TestSupportProps {
    /** DashCanvasModel to which dragged view specs will be added. */
    dashCanvasModel: DashCanvasModel;
}

/**
 * Displays available {@link DashCanvasViewSpec}s as draggable items that can be dropped onto a
 * {@link DashCanvas} to add new views. View specs are listed in their defined order, grouped by
 * their `groupName` property if present. Place inside a collapsible panel alongside a DashCanvas.
 */
export const [DashCanvasWidgetChooser, dashCanvasWidgetChooser] =
    hoistCmp.withFactory<DashCanvasWidgetChooserProps>({
        displayName: 'DashCanvasWidgetChooser',
        model: creates(DashCanvasWidgetChooserModel),
        className: 'xh-dash-canvas-widget-chooser',

        render({dashCanvasModel, className, testId}) {
            return vframe({
                className,
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
const draggableWidget = hoistCmp.factory<
    HoistProps<DashCanvasWidgetChooserModel> & {viewSpec: DashCanvasViewSpec}
>({
    displayName: 'DraggableWidget',
    model: uses(DashCanvasWidgetChooserModel),
    render({model, viewSpec}) {
        const {icon, title} = viewSpec;
        return div({
            className: 'xh-dash-canvas-widget-chooser__draggable-widget',
            draggable: true,
            unselectable: 'on',
            onDragStart: e => model.onDragStart(e, viewSpec),
            onDragEnd: e => model.onDragEnd(e),
            items: [icon, ' ', title]
        });
    }
});

/** Create draggable widget elements for each addable view spec, grouped by `groupName`. */
function createDraggableItems(dashCanvasModel: DashCanvasModel): ReactNode[] {
    if (!dashCanvasModel?.ref.current) return [];

    const groupedItems: Record<string, GroupEntry[]> = {},
        ungroupedItems: ReactElement[] = [];

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
                const group = groupedItems[groupName],
                    entry: GroupEntry = {item, icon: viewSpec.icon};
                if (group) {
                    group.push(entry);
                } else {
                    groupedItems[groupName] = [entry];
                }
            } else {
                ungroupedItems.push(item);
            }
        });

    return [
        ...Object.keys(groupedItems).map(groupName => {
            const entries = groupedItems[groupName],
                firstIcon = entries[0]?.icon,
                icon =
                    firstIcon &&
                    every(entries, it => it.icon?.props.iconName === firstIcon.props.iconName)
                        ? firstIcon
                        : null;

            return card({
                icon,
                title: groupName,
                items: entries.map(it => it.item),
                modelConfig: {collapsible: true}
            });
        }),
        ...ungroupedItems
    ];
}

interface GroupEntry {
    item: ReactElement;
    icon?: ReactElement;
}
