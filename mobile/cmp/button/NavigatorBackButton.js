/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {NavigatorModel} from '@xh/hoist/mobile/cmp/navigator';

/**
 * Convenience Button preconfigured to use navigate back one page.
 */
export const [NavigatorBackButton, navigatorBackButton] = hoistCmp.withFactory({
    displayName: 'NavigatorBackButton',
    model: false,

    render({
        icon = Icon.chevronLeft(),
        onClick = () => XH.popRoute(),
        ...props
    }) {
        const model = useContextModel(NavigatorModel);

        if (!model || model.stack.length < 2) return null;
        return button({icon, onClick, ...props});
    }
});
NavigatorBackButton.propTypes = Button.propTypes;
