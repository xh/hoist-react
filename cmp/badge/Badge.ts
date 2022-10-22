/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {BoxProps, hoistCmp, Intent} from '@xh/hoist/core';
import classNames from 'classnames';
import {div} from '@xh/hoist/cmp/layout';
import './Badge.scss';


export interface BadgeProps extends BoxProps {
    /** Sets fontsize to half that of parent element (default false). */
    compact?: boolean;

    intent?: Intent
}

/**
 * Badge indicator, generally displayed inline with text/title, showing a count or other small
 * indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory<BadgeProps>({
    displayName: 'Badge',
    model: false,

    className: 'xh-badge',

    render({className, intent, compact = false, ...props}) {
        const classes = [];

        if (intent) {
            classes.push(`xh-badge--intent-${intent}`);
        }

        if (compact) {
            classes.push('xh-badge--compact');
        }

        return div({
            className: classNames(className, classes),
            ...props
        });
    }
});