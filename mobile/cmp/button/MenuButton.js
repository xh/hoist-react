/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for a dropdown menu operation.
 */
export const [MenuButton, menuButton] = hoistCmp.withFactory({
    displayName: 'NavigatorBackButton',
    model: uses(MenuModel),

    render({model, ...rest}) {
        return button({
            icon: Icon.bars(),
            onClick: () => model.open(),
            ...rest
        });
    }
});
MenuButton.propTypes = {...Button.propTypes};