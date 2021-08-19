/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import PT from 'prop-types';
import {div} from '@xh/hoist/cmp/layout';
import './Badge.scss';

/**
 * Badge indicator, generally displayed inline with text/title, showing a count or other small
 * indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory({
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
Badge.propTypes = {
    /** Sets fontsize to half that of parent element (default false). */
    compact: PT.bool,

    intent: PT.oneOf(['primary', 'success', 'warning', 'danger'])
};
