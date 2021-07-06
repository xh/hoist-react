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
 * Badge indicator displayed inline with text/title - usually in a tab - showing a count or other
 * small indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory({
    displayName: 'Badge',
    model: false,

    className: 'xh-badge',

    render({intent, tab, className, ...props}) {
        return div({
            className: classNames(
                className,
                `${className}${intent ? `--intent-${intent}` : ''}`,
                `${className}${tab ? `--tab` : ''}`
            ),
            ...props
        });
    }
});
Badge.propTypes = {
    /** True adds className to place badge in upper right corner of tab container (defaults to false). */
    tab: PT.bool,

    intent: PT.oneOf(['primary', 'success', 'warning', 'danger'])
};
