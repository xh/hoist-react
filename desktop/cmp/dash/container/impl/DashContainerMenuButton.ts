/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {dashContainerContextMenu} from './DashContainerContextMenu';

/**
 * Button and popover for displaying the context menu. Apps can control whether this button is
 * displayed via DashContainerModel's `showMenuButton` config.
 *
 * @internal
 */
export const dashContainerMenuButton = hoistCmp.factory({
    model: null,
    render({stack, dashContainerModel}) {
        if (dashContainerModel.contentLocked || !dashContainerModel.showMenuButton) return null;

        return popover({
            position: Position.BOTTOM,
            target: button({
                icon: Icon.ellipsisVertical(),
                className: 'xh-dash-container-menu-btn'
            }),
            content: dashContainerContextMenu({stack, dashContainerModel})
        });
    }
});
