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
    splitGroupPath,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {SelectOption} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, startCase} from 'lodash';
import {ReactNode} from 'react';

/** SelectOption for a group path, with depth for indented hierarchical rendering. */
export interface GroupPathOption extends SelectOption {
    /** Full delimited group path, or null for the top-level (no group) option. */
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

    return includeRoot ? [{value: null, label: '(Top Level)', depth: 0}, ...ret] : ret;
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
    const {value, label, depth} = opt;
    return hbox({
        alignItems: 'center',
        paddingLeft: (depth ?? 0) * 15,
        items: [
            Icon.folder({omit: value == null}),
            span({
                item: value == null ? label : getGroupLeaf(value),
                style: {marginLeft: value == null ? 0 : 5}
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
