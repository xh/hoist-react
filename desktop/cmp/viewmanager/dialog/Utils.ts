/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, fragment, hbox, p, span, strong} from '@xh/hoist/cmp/layout';
import {
    getAllGroupPaths,
    getGroupLeaf,
    splitGroupPath,
    ViewInfo,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {PlainObject, SelectOption, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, every, startCase} from 'lodash';
import {ReactNode} from 'react';

/**
 * Sentinel value for a group select whose bound views span multiple groups. Displayed via a
 * generated "[mixed]" option and never a legitimate save target - any real selection (or a clear
 * to empty, meaning top level) differs from this value and marks the field dirty.
 */
export const MIXED_GROUP_VALUE = 'xh-mixed-group-value';

/** SelectOption for a group path, with depth for indented hierarchical rendering. */
export interface GroupPathOption extends SelectOption {
    /** Full delimited group path. */
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
export function getGroupPathOptions(vmm: ViewManagerModel, isGlobal: boolean): GroupPathOption[] {
    const views = isGlobal ? vmm.globalViews : vmm.ownedViews;
    return getAllGroupPaths(views).map(path => ({
        value: path,
        label: path,
        depth: splitGroupPath(path).length - 1
    }));
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

/**
 * Factory for a menu renderer displaying a {@link GroupPathOption} as its leaf name, indented
 * per depth. Mirrors the default Select renderer's left gutter, with a check marking the option
 * matching `selectedValue` - pass the select's currently committed value from the caller's
 * render, as custom option renderers do not otherwise receive the selection.
 */
export function groupPathOptionRenderer(
    selectedValue: string
): (opt: GroupPathOption) => ReactNode {
    return opt => {
        const {value, label, depth} = opt;

        // Pass through the "Create..." option injected dynamically by react-select when the user
        // types a new path (with `enableCreate`) - its label is the formatted create message.
        if ((opt as PlainObject).__isNew__) return div({item: label, style: {paddingLeft: 25}});

        return hbox({
            alignItems: 'center',
            items: [
                div({
                    style: {minWidth: 25, textAlign: 'center'},
                    item: value === selectedValue ? Icon.check({size: 'sm'}) : null
                }),
                hbox({
                    alignItems: 'center',
                    paddingLeft: (depth ?? 0) * 15,
                    items: [
                        Icon.folder(),
                        span({
                            item: getGroupLeaf(value),
                            style: {marginLeft: 5}
                        })
                    ]
                })
            ]
        });
    };
}

/**
 * Confirm a bulk visibility change across one or more views, with wording appropriate to the
 * target visibility. Pass `hasOtherChanges` when the same save carries additional updates, to
 * broaden the confirm button text accordingly.
 */
export async function confirmVisibilityChangeAsync(
    vmm: ViewManagerModel,
    views: ViewInfo[],
    visibility: Visibility,
    hasOtherChanges: boolean
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
            text: hasOtherChanges ? 'Yes, save changes' : 'Yes, update visibility',
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
