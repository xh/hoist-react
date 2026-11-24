/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {splitGroupPath} from '@xh/hoist/cmp/viewmanager';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import {isArray, isEmpty, last} from 'lodash';

const SEPARATOR = '›';
const ELLIPSIS = '…';

export interface GroupPathBreadcrumbProps extends HoistProps {
    /**
     * Delimited group path to render, or its segments already split - for a path with segments
     * that may themselves contain the delimiter, such as a view name. Null/empty renders nothing.
     */
    path: string | string[];

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

    render({path, inheritColor, maxChars = 44, className}) {
        const segments = isArray(path) ? path : splitGroupPath(path);
        if (isEmpty(segments)) return null;

        const fullText = segments.join(` ${SEPARATOR} `),
            // Collapse the middle - the leaf is the identifying segment.
            collapse = segments.length > 2 && fullText.length > maxChars,
            shown = collapse ? [segments[0], ELLIPSIS, last(segments)] : segments;

        const children = [];
        shown.forEach((segment, idx) => {
            if (idx) {
                children.push(
                    span({
                        key: `sep-${idx}`,
                        className: 'xh-view-manager__group-path__separator',
                        children: SEPARATOR
                    })
                );
            }
            children.push(
                span({
                    key: idx,
                    className: classNames(
                        'xh-view-manager__group-path__segment',
                        collapse && idx === 1 && 'xh-view-manager__group-path__segment--collapsed'
                    ),
                    children: segment
                })
            );
        });

        return span({
            className: classNames(
                className,
                inheritColor && 'xh-view-manager__group-path--inherit'
            ),
            title: collapse ? fullText : null,
            children
        });
    }
});
