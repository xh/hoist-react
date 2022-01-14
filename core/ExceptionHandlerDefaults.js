/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Provides a centralized location to set Exception Handling defaults.
 * Can be overwritten to apply throughout the application.
 */
export class ExceptionHandlerDefaults {

    /**
     * Property paths within error details JSON to replace with REDACT_TEXT
     * @type {string[]}
     */
    static REDACT_PATHS = [
        'fetchOptions.headers.Authorization'
    ];

    /**
     * Text used to replace values that match REDACT_PATHS
     * @type {string}
     */
    static REDACT_TEXT = '[redacted]';

    /**
     * Default type of alert to use to display exceptions with `showAlert`.
     * Valid options are 'dialog'|'toast'.
     * @type {string}
     */
    static ALERT_TYPE = 'dialog';

    /**
     * Default props provided to toast, when alert type is 'toast'
     * @type {Object}
     */
    static TOAST_PROPS = {
        intent: 'danger',
        timeout: 10000
    };
}