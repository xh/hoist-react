/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {NavigatorModel} from '@xh/hoist/mobile/cmp/navigator';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured to use navigate back one page.
 */
export const [NavigatorBackButton, navigatorBackButton] = hoistCmp.withFactory({
    displayName: 'NavigatorBackButton',
    model: uses(NavigatorModel),

    render({model, ...rest}) {
        if (model.pages.length < 2) return null;
        return button({
            icon: Icon.chevronLeft(),
            onClick: () => XH.popRoute(),
            ...rest
        });
    }
});
NavigatorBackButton.propTypes = {...Button.propTypes};