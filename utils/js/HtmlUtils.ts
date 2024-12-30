/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Strip HTML tags from a source text.
 */
export function stripTags(value: any): string {
    return !value ? value : String(value).replace(/<\/?[^>]+>/gi, '');
}
