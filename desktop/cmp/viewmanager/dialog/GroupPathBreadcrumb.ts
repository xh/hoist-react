/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {splitGroupPath} from '@xh/hoist/cmp/viewmanager';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import classNames from 'classnames';
import {isEmpty, last} from 'lodash';

/** Separator rendered between group path segments - a text character, not an icon. */
const SEPARATOR = '›';
const ELLIPSIS = '…';

export interface GroupPathBreadcrumbProps extends HoistProps {
    /** Delimited group path to render - null/empty renders nothing. */
    path: string;

    /**
     * True to present the final segment as the subject of the breadcrumb - bolded, with its
     * ancestors muted. For a group's own label, or the value shown in a closed select.
     */
    emphasizeLeaf?: boolean;

    /** True to mute the entire path, where it provides context rather than the subject. */
    muted?: boolean;

    /**
     * Length in chars beyond which the middle segments collapse to an ellipsis, with the full
     * path moved to a tooltip. Default 44.
     */
    maxChars?: number;
}

/**
 * The single rendering of a view group path anywhere it is *displayed* - `Africa › Sub-Saharan`.
 * The slash delimiter within the persisted group string is an implementation detail, and never
 * surfaces here. The one place a literal slash remains correct is the composed-path preview
 * beneath the group field, where the point is to show the value about to be written.
 */
export const groupPathBreadcrumb = hoistCmp.factory<GroupPathBreadcrumbProps>({
    displayName: 'GroupPathBreadcrumb',
    className: 'xh-view-manager__group-path',
    model: false,

    render({path, emphasizeLeaf, muted, maxChars = 44, className}) {
        const segments = splitGroupPath(path);
        if (isEmpty(segments)) return null;

        const fullText = segments.join(` ${SEPARATOR} `),
            // Collapse the middle rather than the tail - the tail segment is the identifying
            // one. Length-based rather than measured: deterministic, and avoids a layout pass
            // for a control whose width is fixed by the form it sits in.
            collapse = segments.length > 2 && fullText.length > maxChars,
            shown = collapse ? [segments[0], ELLIPSIS, last(segments)] : segments;

        const items = [];
        shown.forEach((segment, idx) => {
            if (idx) {
                items.push(
                    span({
                        key: `sep-${idx}`,
                        className: 'xh-view-manager__group-path__separator',
                        item: SEPARATOR
                    })
                );
            }
            const isCollapsed = collapse && idx === 1;
            items.push(
                span({
                    key: idx,
                    className: classNames(
                        'xh-view-manager__group-path__segment',
                        isCollapsed && 'xh-view-manager__group-path__segment--collapsed',
                        !isCollapsed &&
                            idx === shown.length - 1 &&
                            'xh-view-manager__group-path__segment--leaf'
                    ),
                    item: segment
                })
            );
        });

        return span({
            className: classNames(
                className,
                emphasizeLeaf && 'xh-view-manager__group-path--emph',
                muted && 'xh-view-manager__group-path--muted'
            ),
            title: collapse ? fullText : null,
            items
        });
    }
});
