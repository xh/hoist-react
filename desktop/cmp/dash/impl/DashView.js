/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, refreshContextView, RenderMode, uses} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import {Icon} from '../../../../icon';
import {DashGridLayoutContainerModel} from '../../dashGrid';
import {panel} from '../../panel';
import {button} from '../../button';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {DashViewModel} from '../DashViewModel';

/**
 * Implementation component to show an item within a DashContainer.  This component
 * is used by DashContainer's internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const dashView = hoistCmp.factory({
    displayName: 'DashView',
    className: 'xh-dash-tab',
    model: uses(DashViewModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, className}) {
        const {isActive, renderMode, refreshContextModel, viewSpec, containerModel, id} = model,
            wasActivated = useRef(false);

        // Respect RenderMode
        if (!wasActivated.current && isActive) {
            wasActivated.current = true;
        }

        if (
            !isActive &&
            (
                (renderMode === RenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode === RenderMode.LAZY && !wasActivated.current)
            )
        ) {
            return null;
        }

        if (containerModel instanceof DashGridLayoutContainerModel) {
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
                                    disabled: !viewSpec.allowRename,
                                    actionFn: () => containerModel.renameView(id)
                                },
                                {
                                    text: 'Duplicate',
                                    icon: Icon.copy(),
                                    actionFn: () =>
                                        containerModel.addView(viewSpec.id, model.positionParams)
                                },
                                '-',
                                {
                                    text: 'Remove',
                                    icon: Icon.cross(),
                                    disabled: !viewSpec.allowRemove,
                                    actionFn: () => containerModel.removeView(id)
                                }
                            ]
                        })
                    })
                ],
                item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
            });
        } else {
            return frame({
                className,
                item: refreshContextView({
                    model: refreshContextModel,
                    item: elementFromContent(viewSpec.content, {flex: 1})
                })
            });
        }
    }
});
