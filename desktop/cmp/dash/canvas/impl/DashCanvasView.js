/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {ContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {withFullScreenHandler} from '@xh/hoist/desktop/cmp/fullscreenhandler/FullScreenHandler';
import {elementFromContent} from '@xh/hoist/utils/react';
import {Icon} from '@xh/hoist/icon';
import {panel} from '../../../panel';
import {button} from '../../../button';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {DashCanvasViewModel} from '../DashCanvasViewModel';

/**
 * Implementation component to show an item within a DashCanvas.  This component
 * is used by DashCanvas's internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashCanvasViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashCanvasViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const dashCanvasView = withFullScreenHandler(hoistCmp.factory({
    displayName: 'DashGridLayoutView',
    className: 'xh-dash-tab',
    model: uses(DashCanvasViewModel, {publishMode: ModelPublishMode.LIMITED}),
    render({model, className, fullScreenHandlerModel}) {
        const {viewSpec, ref, hidePanelHeader} = model,
            headerProps = hidePanelHeader ? {} : {
                compactHeader: true,
                title: model.title,
                icon: model.icon,
                headerItems: [
                    fullScreenButton({fullScreenHandlerModel, omit: model.hideFullScreenButton}),
                    // TODO - Investigate why {model} must be passed explicitly here
                    headerMenu({model, omit: fullScreenHandlerModel.isFullScreen})
                ]
            };
        return panel({
            className,
            ref,
            ...headerProps,
            item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
        });
    }
}));

const fullScreenButton = hoistCmp.factory(
    ({fullScreenHandlerModel}) => button({
        icon: !fullScreenHandlerModel.isFullScreen ? Icon.expand() : Icon.close(),
        onClick: () => fullScreenHandlerModel.toggleFullScreen()
    })
);

const headerMenu = hoistCmp.factory(
    ({model}) => {
        if (model.hideMenuButton) return null;

        const {viewState, viewSpec, id, containerModel, positionParams, title} = model,
            {extraMenuItems, contentLocked, renameLocked} = containerModel,

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
                        hidden: contentLocked || viewSpec.unique,
                        actionFn: () =>
                            containerModel.addViewInternal(viewSpec.id, {
                                layout: getDuplicateLayout(positionParams, model),
                                state: viewState,
                                title
                            }).ensureVisible()
                    },
                    '-',
                    ...(extraMenuItems ?? [])
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
    }
);

//------------------------
// Implementation
//------------------------
/** Returns layout for duplicate view, directly underneath original */
const getDuplicateLayout = (layout, model) => {
    const {w: width, h: height, x: startX, y: startY} = layout;
    return {...layout, ...model.containerModel.getNextAvailablePosition({width, height, startX, startY})};

};