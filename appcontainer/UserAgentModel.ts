/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import parser from 'ua-parser-js';

/**
 * Support for user agent parsing.
 * @internal
 */
export class UserAgentModel extends HoistModel {
    override xhImpl = true;

    private _uaParser: any = null;

    get isPhone(): boolean {
        return this.uaParser.getDevice().type === 'mobile';
    }

    get isTablet(): boolean {
        return this.uaParser.getDevice().type === 'tablet';
    }

    get isDesktop(): boolean {
        return this.uaParser.getDevice().type === undefined;
    }

    //---------------------
    // Implementation
    //---------------------
    private get uaParser() {
        return (this._uaParser = this._uaParser ?? new parser());
    }
}
