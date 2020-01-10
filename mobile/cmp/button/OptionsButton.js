/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
export const [OptionsButton, optionsButton] = hoistCmp.withFactory({
    displayName: 'OptionsButton',
    model: false,

    render({
        icon = Icon.gear(),
        onClick = () => XH.showOptionsDialog(),
        ...props
    }) {
        return button(icon, onClick, props);
    }
});
OptionsButton.propTypes = Button.propTypes;
