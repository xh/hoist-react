/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {ContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {elementFromContent, useOnResize} from '@xh/hoist/utils/react';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {button} from '../../../button';
import {panel} from '../../../panel';
import {DashCanvasViewModel} from '../DashCanvasViewModel';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';

/**
 * Implementation component to show an item within a DashCanvas.  This component
 * is used by DashCanvas's internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashCanvasViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashCanvasViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @internal
 */
export const dashCanvasView = hoistCmp.factory({
    displayName: 'DashCanvasView',
    className: 'xh-dash-tab',
    model: uses(DashCanvasViewModel, {publishMode: 'limited'}),

    render({model, className}) {
        const {viewSpec, ref, hidePanelHeader, headerItems, autoHeight} = model,
            headerProps = hidePanelHeader
                ? {}
                : {
                      compactHeader: true,
                      title: model.title,
                      icon: model.icon,
                      headerItems: [...headerItems, headerMenu({model})]
                  };
        return panel({
            className,
            ref,
            ...headerProps,
            item: box({
                ref: useOnResize(dims => model.onContentsResized(dims), {debounce: 100}),
                item: errorBoundary(
                    elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
                ),
                flex: autoHeight ? 'none' : 'auto'
            })
        });
    }
});

const headerMenu = hoistCmp.factory<DashCanvasViewModel>(({model}) => {
    if (model.hideMenuButton) return null;

    const {allowDuplicate, viewState, viewSpec, id, containerModel, positionParams, title} = model,
        {contentLocked, renameLocked} = containerModel,
        addMenuItems = createViewMenuItems({
            dashCanvasModel: containerModel,
            viewId: id
        }),
        replaceMenuItems = createViewMenuItems({
            dashCanvasModel: containerModel,
            viewId: id,
            replaceExisting: true
        }),
        content = ContextMenu({
            menuItems: [
                {
                    text: 'Add',
                    icon: Icon.add(),
                    items: addMenuItems,
                    hidden: contentLocked
                },
                {
                    text: 'Remove',
                    icon: Icon.cross(),
                    hidden: !viewSpec.allowRemove || contentLocked,
                    actionFn: () => containerModel.removeView(id)
                },
                {
                    text: 'Rename',
                    icon: Icon.edit(),
                    hidden: !viewSpec.allowRename || renameLocked,
                    actionFn: () => containerModel.renameView(id)
                },
                {
                    text: 'Replace',
                    icon: Icon.transaction(),
                    items: replaceMenuItems,
                    hidden: !viewSpec.allowRemove || contentLocked
                },
                {
                    text: 'Duplicate',
                    icon: Icon.copy(),
                    hidden: !allowDuplicate || contentLocked || viewSpec.unique,
                    actionFn: () =>
                        containerModel
                            .addViewInternal(viewSpec.id, {
                                layout: getDuplicateLayout(positionParams, model),
                                state: viewState,
                                title
                            })
                            .ensureVisible()
                },
                '-',
                ...(model.extraMenuItems ?? []),
                '-',
                ...(containerModel.extraMenuItems ?? [])
            ]
        });

    // Workaround using React functional component to check if ContextMenu renders null
    // TODO - build a popover wrapper that null-checks content instead of this workaround
    if (!content) return null;

    return popover({
        position: Position.BOTTOM,
        minimal: true,
        target: button({
            icon: Icon.ellipsisVertical()
        }),
        content
    });
});

//------------------------
// Implementation
//------------------------
/** Returns layout for duplicate view, directly underneath original */
const getDuplicateLayout = (layout, model) => {
    const {w: width, h: height, x: startX, y: startY} = layout;
    return {
        ...layout,
        ...model.containerModel.getNextAvailablePosition({width, height, startX, startY})
    };
};
