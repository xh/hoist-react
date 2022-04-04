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
import {panel} from '../../panel';
import {button} from '../../button';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {DashGridLayoutViewModel} from '../../dashGrid/DashGridLayoutViewModel';

/**
 * Implementation component to show an item within a DashGridLayoutContainer.  This component
 * is used by DashGridLayoutContainer's internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashGridLayoutViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashGridLayoutViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const dashGridLayoutView = hoistCmp.factory({
    displayName: 'DashGridLayoutView',
    className: 'xh-dash-tab',
    model: uses(DashGridLayoutViewModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, className}) {
        const {viewSpec, viewState, containerModel, id, positionParams, title} = model,
            {extraMenuItems} = containerModel;
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
                                actionFn: () => containerModel.renameView(id)
                            },
                            {
                                text: 'Duplicate',
                                icon: Icon.copy(),
                                actionFn: () =>
                                    containerModel.addView(viewSpec.id, {...positionParams, viewState, title})
                            },
                            {
                                text: 'Remove',
                                icon: Icon.cross(),
                                intent: 'danger',
                                hidden: !viewSpec.allowRemove,
                                actionFn: () => containerModel.removeView(id)
                            },
                            ...(extraMenuItems ? ['-', ...extraMenuItems] : [])
                        ]
                    })
                })
            ],
            item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
        });
    }
});
