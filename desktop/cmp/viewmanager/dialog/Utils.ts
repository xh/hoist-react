/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {hbox, span} from '@xh/hoist/cmp/layout';
import {
    getAllGroupPaths,
    getGroupLeaf,
    isGroupSameOrDescendant,
    normalizeGroupPath,
    splitGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {PlainObject, SelectOption} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, startCase} from 'lodash';
import {ReactNode} from 'react';

/**
 * Sentinel option value representing an explicit move to the top level (no group), for group
 * selects whose field inits to null/empty to mean "no change" - a null-valued top-level option
 * would neither display nor register as dirty correctly there. Map back to a null group on save.
 */
export const TOP_LEVEL_VALUE = 'xh-top-level-group-value';

/** User-facing label for the top-level / no-group option in group path selects. */
const TOP_LEVEL_LABEL = '(Top Level)';

/**
 * Resolve a group select's committed value to a persistable group path (null for top level).
 *
 * Handles the top-level option's sentinel value and label: with `enableCreate`, the select seeds
 * its filter input with the selected option's label, so a new path typed while the top-level
 * option was selected arrives prefixed with its display label - e.g. `(Top Level)/New Group` -
 * which must not leak into the persisted path.
 */
export function parseGroupSelectValue(value: string): string {
    if (value == null || value === TOP_LEVEL_VALUE || value === TOP_LEVEL_LABEL) return null;
    const prefix = TOP_LEVEL_LABEL + VIEW_GROUP_DELIMITER;
    return normalizeGroupPath(value.startsWith(prefix) ? value.substring(prefix.length) : value);
}

/** SelectOption for a group path, with depth for indented hierarchical rendering. */
export interface GroupPathOption extends SelectOption {
    /**
     * Full delimited group path, or null (or {@link TOP_LEVEL_VALUE}) for the top-level
     * (no group) option.
     */
    value: string;
    /**
     * Full delimited group path, displayed as-is in the select's value container so the complete
     * hierarchy is unambiguous when selected or when typing a new path. Menu items instead render
     * the leaf segment, indented per depth, via {@link groupPathOptionRenderer}.
     */
    label: string;
    /** 0-based nesting depth, for indentation. */
    depth: number;
}

/**
 * Options for all existing group paths across the relevant views, including implied ancestor
 * paths, in depth-first order suitable for display as an indented hierarchy via
 * {@link groupPathOptionRenderer}.
 */
export function getGroupPathOptions(
    vmm: ViewManagerModel,
    isGlobal: boolean,
    opts?: {
        /** True to prepend a null-valued option representing the top level / no group. */
        includeRoot?: boolean;
        /** Group path to exclude, along with all of its descendants. */
        excludeSubtreeOf?: string;
    }
): GroupPathOption[] {
    const views = isGlobal ? vmm.globalViews : vmm.ownedViews,
        {includeRoot, excludeSubtreeOf} = opts ?? {};

    const ret = getAllGroupPaths(views)
        .filter(path => !isGroupSameOrDescendant(path, excludeSubtreeOf))
        .map(path => ({
            value: path,
            label: path,
            depth: splitGroupPath(path).length - 1
        }));

    return includeRoot ? [{value: null, label: TOP_LEVEL_LABEL, depth: 0}, ...ret] : ret;
}

/** Display a group path as its segments separated by chevrons, or a muted 'None' when null. */
export function groupPathDisplay(path: string): ReactNode {
    if (!path) return span({item: 'None', className: 'xh-text-color-muted'});
    const items = [];
    splitGroupPath(path).forEach((segment, idx) => {
        if (idx) items.push(Icon.chevronRight({className: 'xh-text-color-muted'}));
        items.push(span(segment));
    });
    return hbox({alignItems: 'center', items});
}

/** Menu renderer displaying a {@link GroupPathOption} as its leaf name, indented per depth. */
export function groupPathOptionRenderer(opt: GroupPathOption): ReactNode {
    const {value, label, depth} = opt,
        isTopLevel = value == null || value === TOP_LEVEL_VALUE;

    // Pass through the "Create..." option injected dynamically by react-select when the user
    // types a new path (with `enableCreate`) - its label is the formatted create message.
    if ((opt as PlainObject).__isNew__) return label;

    return hbox({
        alignItems: 'center',
        paddingLeft: (depth ?? 0) * 15,
        items: [
            Icon.folder({omit: isTopLevel}),
            span({
                item: isTopLevel ? label : getGroupLeaf(value),
                style: {marginLeft: isTopLevel ? 0 : 5}
            })
        ]
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
