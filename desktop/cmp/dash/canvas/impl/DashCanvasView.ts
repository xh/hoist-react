/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, type MenuItemLike, uses} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/menu/impl/MenuItems';
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
        const {viewSpec, ref, hidePanelHeader, headerItems, autoHeight, fullTitle, icon} = model,
            headerProps = hidePanelHeader
                ? {}
                : {
                      compactHeader: true,
                      title: fullTitle,
                      icon,
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
        menuItems: MenuItemLike[] = [
            {
                text: 'Add',
                icon: Icon.add(),
                items: addMenuItems,
                hidden: contentLocked || isEmpty(addMenuItems)
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
                hidden: !viewSpec.allowRemove || contentLocked || isEmpty(replaceMenuItems)
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
        ];

    // Skip the button if every item is hidden.
    if (isEmpty(parseMenuItems(menuItems))) return null;

    return popover({
        position: Position.BOTTOM,
        minimal: true,
        item: button({
            icon: Icon.ellipsisVertical()
        }),
        content: contextMenu({menuItems})
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
