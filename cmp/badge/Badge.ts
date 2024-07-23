/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, Intent} from '@xh/hoist/core';
import {TEST_ID, mergeDeep} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import './Badge.scss';

export interface BadgeProps extends HoistProps, BoxProps {
    /** Sets fontsize to half that of parent element (default false). */
    compact?: boolean;

    intent?: Intent;
}

/**
 * Badge indicator, generally displayed inline with text/title, showing a count or other small
 * indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory<BadgeProps>({
    displayName: 'Badge',
    model: false,

    className: 'xh-badge',

    render(props, ref) {
        const classes = [],
            [layoutProps, {className, intent, compact, children, testId, ...restProps}] =
                splitLayoutProps(props);

        if (intent) {
            classes.push(`xh-bg-intent-${intent}`);
        }

        if (compact) {
            classes.push('xh-badge--compact');
        }

        const divProps = mergeDeep(
            {className: classNames(className, classes)},
            {style: layoutProps},
            {[TEST_ID]: testId},
            restProps
        );

        return div({
            ref,
            ...divProps,
            items: children
        });
    }
});
