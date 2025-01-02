/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {fmtCompactDate} from '@xh/hoist/format';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {jwtDecode} from 'jwt-decode';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {isNil} from 'lodash';

export type TokenMap = Record<string, Token>;

export class Token {
    readonly value: string;
    readonly decoded: PlainObject;
    readonly expiry: number;

    constructor(value: string) {
        this.value = value;
        this.decoded = jwtDecode(value);
        this.expiry = this.decoded.exp * SECONDS;
    }

    expiresWithin(interval: number): boolean {
        return olderThan(this.expiry, -interval);
    }

    get formattedExpiry() {
        const rel = getRelativeTimestamp(this.expiry, {allowFuture: true});
        return `expires ${fmtCompactDate(this.expiry)} (${rel})`;
    }

    get forLog(): PlainObject {
        const ret: PlainObject = {...this.decoded};
        ['iat', 'nbf', 'exp'].forEach(k => {
            const val = ret[k];
            ret[k] = isNil(val) ? val : new Date(val * SECONDS);
        });
        return ret;
    }

    equals(other: Token) {
        return this.value == other?.value;
    }
}
