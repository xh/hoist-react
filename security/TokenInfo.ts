/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {jwtDecode} from 'jwt-decode';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {isNil} from 'lodash';

export class TokenInfo {
    readonly token: string;
    readonly decoded: PlainObject;
    readonly expiry: number;

    constructor(token: string) {
        this.token = token;
        this.decoded = jwtDecode(token);
        this.expiry = this.decoded.exp * SECONDS;
    }

    expiresWithin(interval: number): boolean {
        return olderThan(this.expiry, -interval);
    }

    get formattedExpiry() {
        return getRelativeTimestamp(this.expiry, {allowFuture: true, prefix: 'expires'});
    }

    get forLog(): PlainObject {
        const ret: PlainObject = {...this.decoded};
        ['iat', 'nbf', 'exp'].forEach(k => {
            const val = ret[k];
            ret[k] = isNil(val) ? val : new Date(val * SECONDS);
        });
        return ret;
    }

    equals(other: TokenInfo) {
        return this.token == other?.token;
    }
}
