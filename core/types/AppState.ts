/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Enumeration of possible App States
 */
export const AppState = Object.freeze({
    // Main Flow
    PRE_AUTH: 'PRE_AUTH',
    AUTHENTICATING: 'AUTHENTICATING',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    INITIALIZING_HOIST: 'INITIALIZING_HOIST',
    INITIALIZING_APP: 'INITIALIZING_APP',
    RUNNING: 'RUNNING',
    SUSPENDED: 'SUSPENDED',

    // Terminal Error States.
    LOAD_FAILED: 'LOAD_FAILED',
    ACCESS_DENIED: 'ACCESS_DENIED'
});

// eslint-disable-next-line
export type AppState = (typeof AppState)[keyof typeof AppState];

export interface AppSuspendData {
    message?: string;
    reason: 'IDLE' | 'SERVER_FORCE' | 'APP_UPDATE';
}
