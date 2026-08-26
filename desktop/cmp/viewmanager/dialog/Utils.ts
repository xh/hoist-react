/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {fragment, p, span, strong} from '@xh/hoist/cmp/layout';
import {
    getAllGroupPaths,
    isGroupSameOrDescendant,
    normalizeGroupPath,
    ViewInfo,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {SelectOption, XH} from '@xh/hoist/core';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, every, partition, startCase} from 'lodash';
import {ReactNode} from 'react';
import {groupPathBreadcrumb} from './GroupPathBreadcrumb';

/**
 * Sentinel value for the explicit "Top Level" option in a group select - distinct from an empty
 * field, which means "leave each view where it is" in a bulk edit.
 */
export const TOP_LEVEL_GROUP_VALUE = 'xh-top-level-group';

/** SelectOption for a group path. */
export interface GroupPathOption extends SelectOption {
    /** Full delimited group path, or the sentinel value above. */
    value: string;
    /** Full delimited path, for screen readers - displayed as a breadcrumb. */
    label: string;
}

/** Resolve a group select value to the group path to persist - sentinel/empty both mean null. */
export function normalizeGroupValue(value: string): string {
    return !value || value === TOP_LEVEL_GROUP_VALUE ? null : normalizeGroupPath(value);
}

/** Display a committed group select value - a breadcrumb, or the italic-muted top-level label. */
export function groupValueDisplay(value: string): ReactNode {
    const path = normalizeGroupValue(value);
    return path ? groupPathBreadcrumb({path}) : topLevelLabel();
}

/** Italic-muted *Top Level*, signalling a value that is not a literal group name. */
export function topLevelLabel(): ReactNode {
    return span({className: 'xh-view-manager__group-path--sentinel', item: 'Top Level'});
}

/**
 * Confirm moving the group at `from` to `to` when a group already exists there, as the two will
 * merge. Returns true (without prompting) when `to` is free, and for any move that cannot merge.
 */
export async function confirmGroupMergeIfExistsAsync(
    vmm: ViewManagerModel,
    from: string,
    to: string,
    isGlobal: boolean
): Promise<boolean> {
    const views = isGlobal ? vmm.globalViews : vmm.ownedViews,
        [movingViews, otherViews] = partition(views, v => isGroupSameOrDescendant(v.group, from));

    if (!getAllGroupPaths(otherViews).includes(to)) return true;

    return XH.confirm({
        message: fragment(
            p(fragment('Group ', groupPathBreadcrumb({path: to}), ' already exists.')),
            p(
                `You will be adding ${pluralize(vmm.typeDisplayName, movingViews.length, true)} to this group.`
            )
        ),
        confirmProps: {
            text: 'Yes, merge groups',
            outlined: true,
            autoFocus: false,
            intent: 'primary'
        }
    });
}

/** Confirm a bulk visibility change, with wording appropriate to the target visibility. */
export async function confirmVisibilityChangeAsync(
    vmm: ViewManagerModel,
    views: ViewInfo[],
    visibility: Visibility
): Promise<boolean> {
    const countStr = pluralize(vmm.typeDisplayName, views.length, true),
        msgs: ReactNode[] = [strong('Are you sure you want to proceed?')];
    switch (visibility) {
        case 'private':
            msgs.unshift(
                `${countStr} will no longer be available to all other ${XH.appName} users.`
            );
            break;
        case 'global':
            msgs.unshift(
                `${countStr} will become globally visible to all other ${XH.appName} users.`
            );
            break;
        case 'shared':
            every(views, 'isGlobal')
                ? msgs.unshift(
                      `${countStr} will no longer be globally visible to all other ${XH.appName} users.`
                  )
                : msgs.unshift(
                      `${countStr} will become available to all other ${XH.appName} users.`
                  );
    }

    return XH.confirm({
        message: fragment(msgs.map(m => p(m))),
        confirmProps: {
            text: 'Yes, update visibility',
            outlined: true,
            autoFocus: false,
            intent: 'primary'
        }
    });
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
            return `Visible to all users via the "Manage ${capitalize(pluralize(vmm.typeDisplayName))}" dialog.`;
        case 'global':
            return `Visible to all users and automatically pinned to their menus.`;
        default:
            return '';
    }
}
