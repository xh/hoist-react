/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {pick} from 'lodash';

/**
 * Extract information about the client browser window and screen
 */
export function getClientDeviceInfo() {
    const data: any = pick(window, 'screen', 'devicePixelRatio', 'screenX', 'screenY', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight');
    if (data.screen) {
        data.screen = pick(data.screen, 'availWidth', 'availHeight', 'width', 'height', 'colorDepth', 'pixelDepth', 'availLeft', 'availTop', 'orientation');
        if (data.screen.orientation) {
            data.screen.orientation = pick(data.screen.orientation, 'angle', 'type');
        }
    }

    return data;
}
