/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

/**
 * Enumeration of possible App States
 */
export const AppState = Object.freeze({
    PRE_AUTH: 'PRE_AUTH',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    INITIALIZING: 'INITIALIZING',
    RUNNING: 'RUNNING',
    SUSPENDED: 'SUSPENDED',
    LOAD_FAILED: 'LOAD_FAILED'
});

// eslint-disable-next-line
export type AppState = (typeof AppState)[keyof typeof AppState];

export interface AppSuspendData {
    message?: string;
    reason: 'IDLE' | 'SERVER_FORCE' | 'APP_UPDATE';
}
