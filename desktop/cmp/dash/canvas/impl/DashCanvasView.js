/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
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
export const dashCanvasView = hoistCmp.factory({
    displayName: 'DashGridLayoutView',
    className: 'xh-dash-tab',
    model: uses(DashCanvasViewModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, className}) {
        const {viewSpec, ref, hidePanelHeader} = model,
            headerProps = hidePanelHeader ? {} : {
                compactHeader: true,
                title: model.title,
                icon: model.icon,
                headerItems: [dashCanvasViewPopover({model})]
            };
        return panel({
            className,
            ref,
            ...headerProps,
            item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
        });
    }
});

const dashCanvasViewPopover = hoistCmp.factory(
    ({model}) => {
        if (model.hideMenuButton) return null;

        const {viewState, viewSpec, id, containerModel, positionParams, title} = model,
            {extraMenuItems, contentLocked, renameLocked} = containerModel,
            replaceMenuItems = createViewMenuItems({dashCanvasModel: containerModel, viewIdToReplace: id});

        return popover({
            position: Position.BOTTOM,
            minimal: true,
            target: button({
                icon: Icon.ellipsisVertical()
            }),
            content: contextMenu({
                menuItems: [
                    {
                        text: 'Rename',
                        icon: Icon.edit(),
                        intent: 'primary',
                        hidden: !viewSpec.allowRename,
                        disabled: renameLocked,
                        actionFn: () => containerModel.renameView(id)
                    },
                    {
                        text: 'Duplicate',
                        icon: Icon.copy(),
                        disabled: contentLocked || viewSpec.unique,
                        actionFn: () =>
                            containerModel.addView(viewSpec.id, {
                                layout: positionParams,
                                state: viewState,
                                title
                            })
                    },
                    {
                        text: 'Replace',
                        icon: Icon.transaction(),
                        items: replaceMenuItems,
                        hidden: !viewSpec.allowRemove || contentLocked
                    },
                    {
                        text: 'Remove',
                        icon: Icon.cross(),
                        intent: 'danger',
                        hidden: !viewSpec.allowRemove,
                        disabled: contentLocked,
                        actionFn: () => containerModel.removeView(id)
                    },
                    '-',
                    ...(extraMenuItems ?? [])
                ]
            })
        });
    }
);