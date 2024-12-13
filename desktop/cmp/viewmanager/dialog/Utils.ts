/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {SelectOption} from '@xh/hoist/core';
import {map, uniq} from 'lodash';

export function getGroupOptions(model: ViewManagerModel, type: 'owned' | 'global'): SelectOption[] {
    const views = type == 'owned' ? model.ownedViews : model.globalViews;
    return uniq(map(views, 'group'))
        .sort()
        .filter(g => g != null)
        .map(g => ({label: g, value: g}));
}
