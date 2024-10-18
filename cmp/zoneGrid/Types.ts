/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {Column, ColumnRenderer, ColumnSortSpec, GridSorterLike} from '@xh/hoist/cmp/grid';
import {PersistOptions, Some} from '@xh/hoist/core';

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

export interface ZoneField {
    field: string;
    displayName: string;
    label: string;
    renderer: ColumnRenderer;
    column: Column;
    chooserGroup: string;
    sortable: boolean;
    sortingOrder: ColumnSortSpec[];
}

export interface ZoneGridModelPersistOptions extends PersistOptions {
    /** True to include mapping information (default true) */
    persistMapping?: boolean;
    /** True to include grouping information (default true) */
    persistGrouping?: boolean;
    /** True to include sorting information (default true) */
    persistSort?: boolean;
}

export interface ZoneGridState {
    sortBy?: GridSorterLike;
    groupBy?: Some<string>;
    version?: number;
    mappings?: Record<Zone, Some<string | ZoneMapping>>;
}
