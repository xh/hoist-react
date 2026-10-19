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
import {
    groupViewSpecs,
    ViewSpecGroup,
    type ViewSpecNode
} from '@xh/hoist/desktop/cmp/dash/impl/DashUtils';
import {every} from 'lodash';
import type {ReactElement, ReactNode} from 'react';
import './DashCanvasWidgetChooser.scss';

export interface DashCanvasWidgetChooserProps extends HoistProps, TestSupportProps {
    /** DashCanvasModel to which dragged view specs will be added. */
    dashCanvasModel: DashCanvasModel;
}

/**
 * Displays available {@link DashCanvasViewSpec}s as draggable items that can be dropped onto a
 * {@link DashCanvas} to add new views. View specs are listed in their defined order, grouped into
 * (nested) cards by their `groupName` property if present. Place inside a collapsible panel
 * alongside a DashCanvas.
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

    const addableSpecs = dashCanvasModel.viewSpecs.filter(viewSpec => {
        return (
            viewSpec.allowAdd &&
            (!viewSpec.unique || !dashCanvasModel.getViewsBySpecId(viewSpec.id).length)
        );
    });

    return createGroupItems(groupViewSpecs(addableSpecs));
}

/** Render groups as collapsible cards, nested as their `groupName` dictates. */
function createGroupItems(nodes: ViewSpecNode<DashCanvasViewSpec>[]): ReactNode[] {
    return nodes.map(it =>
        it instanceof ViewSpecGroup
            ? card({
                  key: `group-${it.name}`,
                  icon: getSharedIcon(it.allViewSpecs),
                  title: it.name,
                  items: createGroupItems(it.children),
                  modelConfig: {collapsible: true}
              })
            : draggableWidget({key: it.id, viewSpec: it})
    );
}

/** The icon of the first spec, if every spec has an icon of the same name. */
function getSharedIcon(viewSpecs: DashCanvasViewSpec[]): ReactElement {
    const faName = (icon: ReactElement) => (icon?.props as {faName?: string})?.faName,
        firstIcon = viewSpecs[0]?.icon;

    return firstIcon && every(viewSpecs, it => faName(it.icon) === faName(firstIcon))
        ? firstIcon
        : null;
}
