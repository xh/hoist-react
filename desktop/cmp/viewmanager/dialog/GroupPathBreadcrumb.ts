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

const SEPARATOR = '›';
const ELLIPSIS = '…';

export interface GroupPathBreadcrumbProps extends HoistProps {
    /** Delimited group path to render - null/empty renders nothing. */
    path: string;

    /** True to bold the final segment and mute its ancestors, presenting it as the subject. */
    emphasizeLeaf?: boolean;

    /** True to mute the entire path, where it provides context rather than the subject. */
    muted?: boolean;

    /** True to take the surrounding text color - e.g. within an intent-colored toast. */
    inheritColor?: boolean;

    /**
     * Length in chars beyond which the middle segments collapse to an ellipsis, with the full path
     * moved to a tooltip. Default 44.
     */
    maxChars?: number;
}

/**
 * Render a view group path for display - `Africa › Sub-Saharan`. Used wherever a path is shown,
 * so that its persisted slash delimiter never surfaces in the UI.
 */
export const groupPathBreadcrumb = hoistCmp.factory<GroupPathBreadcrumbProps>({
    displayName: 'GroupPathBreadcrumb',
    className: 'xh-view-manager__group-path',
    model: false,

    render({path, emphasizeLeaf, muted, inheritColor, maxChars = 44, className}) {
        const segments = splitGroupPath(path);
        if (isEmpty(segments)) return null;

        const fullText = segments.join(` ${SEPARATOR} `),
            // Collapse the middle - the leaf is the identifying segment.
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
                muted && 'xh-view-manager__group-path--muted',
                inheritColor && 'xh-view-manager__group-path--inherit'
            ),
            title: collapse ? fullText : null,
            items
        });
    }
});
