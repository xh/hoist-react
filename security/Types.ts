/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Token} from './Token';

export type TokenMap = Record<string, Token>;

export interface AccessTokenSpec {
    /**
     * Mode governing when the access token should be requested from provider.
     *      eager (default) - initiate lookup on initialization, but do not block on failure.
     *      lazy - lookup when requested by client.
     */
    fetchMode: 'eager' | 'lazy';

    /** Scopes for the desired access token.*/
    scopes: string[];
}
