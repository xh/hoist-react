/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {ContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {elementFromContent} from '@xh/hoist/utils/react';
import {Icon} from '@xh/hoist/icon';
import {panel} from '../../../panel';
import {button} from '../../../button';
import {dialog, popover, Position} from '@xh/hoist/kit/blueprint';
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
    render(props) {
        return props.model.fullScreen ? fullScreenCmp(props) : viewCmp(props);
    }
});

const fullScreenCmp = hoistCmp.factory(
    ({model, className}) => dialog({
        className: 'xh-dash-tab__fullscreen',
        isOpen: true,
        canOutsideClickClose: true,
        item: viewCmp(({model, className})),
        onClose: ()=>model.toggleFullScreen()
    })
);

const viewCmp = hoistCmp.factory(
    ({model, className}) => {
        const {viewSpec, ref, hidePanelHeader} = model,
            headerProps = hidePanelHeader ? {} : {
                compactHeader: true,
                title: model.title,
                icon: model.icon,
                headerItems: [
                    headerMenu(),
                    fullScreenButton()
                ]
            };
        return panel({
            className,
            ref,
            ...headerProps,
            item: elementFromContent(viewSpec.content, {flex: 1, viewModel: model})
        });
    }
);

const fullScreenButton = hoistCmp.factory(
    ({model}) => {
        if (model.hideFullScreenButton) return null;

        const {fullScreen} = model;

        return button({
            icon: fullScreen ? Icon.collapse() : Icon.expand(),
            title: fullScreen ? 'Exit full screen' : 'Full screen',
            onClick: () => model.toggleFullScreen()
        });
    }
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
                            containerModel.addView(viewSpec.id, {
                                layout: positionParams,
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