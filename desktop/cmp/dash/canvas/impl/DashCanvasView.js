/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
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
        const {viewSpec, viewState, containerModel, id, positionParams, title} = model,
            {extraMenuItems, contentLocked, renameLocked} = containerModel;
        return panel({
            className,
            compactHeader: true,
            title: model.title,
            icon: model.icon,
            headerItems: [
                popover({
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
                                disabled: contentLocked,
                                actionFn: () =>
                                    containerModel.addView(viewSpec.id, {...positionParams, viewState, title})
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
                })
            ],
            item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
        });
    }
});
