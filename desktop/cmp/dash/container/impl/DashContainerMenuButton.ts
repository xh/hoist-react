/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {baseUiMenuButton} from '@xh/hoist/desktop/cmp/menu/impl/BaseUiMenu';
import {Icon} from '@xh/hoist/icon';
import {createDashContainerMenuItems} from './DashContainerContextMenu';

/**
 * Button and popover for displaying the context menu. Apps can control whether this button is
 * displayed via DashContainerModel's `showMenuButton` config.
 *
 * @internal
 */
export const dashContainerMenuButton = hoistCmp.factory({
    className: 'xh-dash-container-menu-btn',
    model: null,

    render({stack, dashContainerModel, className}) {
        if (dashContainerModel.contentLocked || !dashContainerModel.showMenuButton) return null;

        return baseUiMenuButton({
            icon: Icon.ellipsisVertical(),
            className,
            menuItems: () => createDashContainerMenuItems({stack, dashContainerModel}),
            menuAlign: 'center'
        });
    }
});
