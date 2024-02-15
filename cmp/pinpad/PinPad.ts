/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {pinPadImpl as desktopPinPadImpl} from '@xh/hoist/dynamics/desktop';
import {pinPadImpl as mobilePinPadImpl} from '@xh/hoist/dynamics/mobile';

import {PinPadModel} from './PinPadModel';

/**
 * Displays a prompt used to get obtain a PIN from the user.
 *
 * Uses a custom key pad and digit display.
 *
 * @see PinPadModel
 */
export const [PinPad, pinPad] = hoistCmp.withFactory({
    displayName: 'PinPad',
    model: uses(PinPadModel),
    className: 'xh-pinpad',

    render(props, ref) {
        return XH.isMobileApp ? mobilePinPadImpl(props, ref) : desktopPinPadImpl(props, ref);
    }
});
