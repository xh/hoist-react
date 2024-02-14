/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

export const ValidationState = Object.freeze({
    Unknown: 'Unknown',
    NotValid: 'NotValid',
    Valid: 'Valid'
});
// eslint-disable-next-line
export type ValidationState = (typeof ValidationState)[keyof typeof ValidationState];
