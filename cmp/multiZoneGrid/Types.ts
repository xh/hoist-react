/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

export type Zone = 'tl' | 'tr' | 'bl' | 'br';

export interface ZoneMapping {
    /** Field to display. Must match a Field found in the Store */
    field: string;
    /** True to prefix the field value with its name */
    showLabel?: boolean;
}

export interface ZoneLimit {
    /** Min number of fields that should be mapped to the zone */
    min?: number;
    /** Max number of fields that should be mapped to the zone */
    max?: number;
    /** Array of allowed fields for the zone */
    only?: string[];
}
