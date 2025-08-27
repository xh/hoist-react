/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {SelectOption} from '@xh/hoist/core';
import {map, startCase, uniq} from 'lodash';

export function getGroupOptions(vmm: ViewManagerModel, isGlobal: boolean): SelectOption[] {
    const views = isGlobal ? vmm.globalViews : vmm.ownedViews;
    return uniq(map(views, 'group'))
        .sort()
        .filter(g => g != null)
        .map(g => ({label: g, value: g}));
}

/**
 * Support for "Visibility" concept used in default view editing/creation.
 * This tri-state selection will translate into boolean `isGlobal` and `isShared`
 * flag settings.
 */
export type Visibility = 'private' | 'shared' | 'global';

export function getVisibilityOptions(vmm: ViewManagerModel): SelectOption[] {
    const ret = [{value: 'private', label: 'Private'}];
    if (vmm.enableSharing) {
        ret.push({value: 'shared', label: 'Shared'});
    }
    if (vmm.enableGlobal && vmm.manageGlobal) {
        ret.push({value: 'global', label: startCase(vmm.globalDisplayName)});
    }
    return ret;
}

export function getVisibilityInfo(vmm: ViewManagerModel, val: Visibility): string {
    switch (val) {
        case 'private':
            return 'Visible to you only.';
        case 'shared':
            return 'Visible to ALL users, discoverable via "Shared" tab.';
        case 'global':
            return `Visible to ALL users, editable by other ${startCase(vmm.globalDisplayName)} editors`;
        default:
            return '';
    }
}
