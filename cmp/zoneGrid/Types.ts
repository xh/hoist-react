/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Column, ColumnRenderer, ColumnSortSpec} from '@xh/hoist/cmp/grid';
import {PersistOptions} from '@xh/hoist/core';

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
    /** True (default) to include mapping state or provide mapping-specific PersistOptions. */
    persistMappings?: boolean | PersistOptions;
    /** True (default) to include grouping state or provide grouping-specific PersistOptions. */
    persistGrouping?: boolean | PersistOptions;
    /** True (default) to include sort state or provide sort-specific PersistOptions. */
    persistSort?: boolean | PersistOptions;
}
