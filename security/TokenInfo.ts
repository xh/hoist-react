/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {jwtDecode} from 'jwt-decode';

export class TokenInfo {
    readonly token: string;
    readonly decoded: PlainObject;
    readonly expiry: number;

    constructor(token: string) {
        this.token = token;
        this.decoded = jwtDecode(token);
        this.expiry = this.decoded.exp * SECONDS;
    }

    forLog() {
        return {
            ...this.decoded,
            exp: new Date(this.expiry)
        };
    }

    expiresWithin(interval: number): boolean {
        return olderThan(this.expiry, -interval);
    }
}
