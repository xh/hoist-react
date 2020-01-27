/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {elementFromContent} from '@xh/hoist/utils/react';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './AddViewButton.scss';

/**
 * Button and popover for adding views to a DashContainer. Apps can customize the
 * popover's content via DashContainerModel's `addViewContent` config.
 *
 * @see DashContainerModel
 * @private
 */
export const addViewButton = hoistCmp.factory({
    render({stack, dashContainerModel}) {
        return popover({
            popoverClassName: 'xh-dash-container-add-view-popover',
            position: Position.BOTTOM_RIGHT,
            target: button({
                icon: Icon.add(),
                title: 'Add view',
                className: 'xh-dash-container-add-view-btn'
            }),
            content: elementFromContent(dashContainerModel.addViewContent, {
                stack,
                dashContainerModel
            })
        });
    }
});