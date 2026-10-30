/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

/**
 * Support for user agent parsing.
 * @internal
 */
export class UserAgentModel extends HoistModel {
    override xhImpl = true;
    override xhName = 'userAgentModel';

    private readonly deviceType: DeviceType = detectDeviceType(navigator);

    get isPhone(): boolean {
        return this.deviceType === 'phone';
    }

    get isTablet(): boolean {
        return this.deviceType === 'tablet';
    }

    get isDesktop(): boolean {
        return this.deviceType === 'desktop';
    }
}

/**
 * Classify the device from its user agent string, with two checks beyond it: Chromium's
 * `userAgentData.mobile` hint, and iPadOS, which reports itself as a Mac but is the only Mac
 * with a multi-touch screen and Safari's `navigator.standalone`. Anything not recognized as a
 * phone or tablet is a desktop.
 */
export function detectDeviceType(nav: Partial<Navigator> & {standalone?: boolean}): DeviceType {
    const ua = nav.userAgent ?? '';

    if (/iPad/.test(ua)) return 'tablet';
    if (/Macintosh/.test(ua) && nav.standalone !== undefined && nav.maxTouchPoints > 2) {
        return 'tablet';
    }
    if (/iPhone|iPod/.test(ua)) return 'phone';
    if (/Windows Phone|IEMobile|BlackBerry|BB10/.test(ua)) return 'phone';
    if (/Android/.test(ua)) return /\bMobile\b/.test(ua) ? 'phone' : 'tablet';
    if (/\bTablet\b|PlayBook|Silk|Kindle/.test(ua)) return 'tablet';
    if (/\bMobile\b|Opera Mini|webOS/.test(ua)) return 'phone';
    if ((nav as any).userAgentData?.mobile) return 'phone';
    return 'desktop';
}
