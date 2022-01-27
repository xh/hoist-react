/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */


/**
 * Enumeration of possible App States
 * @enum {string}
 * @see XHClass.appState
 */
export const AppState = {
    PRE_AUTH:       'PRE_AUTH',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    ACCESS_DENIED:  'ACCESS_DENIED',
    INITIALIZING:   'INITIALIZING',
    RUNNING:        'RUNNING',
    SUSPENDED:      'SUSPENDED',
    LOAD_FAILED:    'LOAD_FAILED'
};
