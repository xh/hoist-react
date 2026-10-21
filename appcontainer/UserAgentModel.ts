/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {UAParser} from 'ua-parser-js';

/**
 * Support for user agent parsing.
 * @internal
 */
export class UserAgentModel extends HoistModel {
    override xhImpl = true;
    override xhName = 'userAgentModel';

    // Parse once - `UAParser.getDevice()` re-runs its full regex set on every call.
    private readonly deviceType: string = new UAParser().getDevice().type;

    get isPhone(): boolean {
        return this.deviceType === 'mobile';
    }

    get isTablet(): boolean {
        return this.deviceType === 'tablet';
    }

    get isDesktop(): boolean {
        return this.deviceType === undefined;
    }
}
