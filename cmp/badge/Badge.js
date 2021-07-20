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

    render({className, intent, position = 'center', ...props}) {
        const classes = [];

        if (intent) {
            classes.push(`xh-badge--intent-${intent}`);
        }

        if (position === 'top' || position === 'bottom') {
            classes.push(`xh-badge--position-${position}`);
        }

        return div({
            className: classNames(className, classes),
            ...props
        });
    }
});
Badge.propTypes = {
    /** Placement of badge (default center). */
    position: PT.oneOf(['center', 'top', 'bottom']),

    intent: PT.oneOf(['primary', 'success', 'warning', 'danger'])
};
