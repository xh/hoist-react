/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Token} from './Token';

export interface AccessTokenSpec {
    /**
     * Mode governing when the access token should be requested from provider:
     *      - eager (or undefined) - load on overall initialization, but do not block on failure.
     *        Useful for tokens that an app is almost certain to require during a user session.
     *      - lazy - defer loading until first requested by client. Useful for tokens that might
     *        never be needed by the app during a given user session.
     */
    fetchMode?: 'eager' | 'lazy';

    /** Scopes for the desired access token.*/
    scopes: string[];
}

export type TokenMap = Record<string, Token>;
