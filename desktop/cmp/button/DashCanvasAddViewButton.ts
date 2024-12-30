/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {DashCanvasModel} from '@xh/hoist/desktop/cmp/dash';
import {createViewMenuItems} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface DashCanvasAddViewButtonProps extends ButtonProps {
    /** DashCanvasModel for which this button should allow the user to add views. */
    dashCanvasModel?: DashCanvasModel;
}

/**
 * A convenience menu button to add views to a DashCanvas.
 */
export const [DashCanvasAddViewButton, dashCanvasAddViewButton] =
    hoistCmp.withFactory<DashCanvasAddViewButtonProps>({
        displayName: 'DashCanvasAddViewButton',
        model: false,

        render({icon, text, dashCanvasModel, ...rest}, ref) {
            dashCanvasModel = withDefault(dashCanvasModel, useContextModel(DashCanvasModel));

            errorIf(
                !dashCanvasModel,
                "No DashCanvasModel available to dashCanvasAddViewButton. Provide via a 'dashCanvasModel' prop, or context."
            );

            const menuItems = createViewMenuItems({dashCanvasModel});
            return popover({
                interactionKind: 'click',
                item: button({
                    ref,
                    icon: withDefault(icon, Icon.add()),
                    text: withDefault(text, dashCanvasModel.addViewButtonText),
                    ...rest
                }),
                content: contextMenu({menuItems})
            });
        }
    });
