/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, filler, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import type {Intent} from '@xh/hoist/core';
import type {PanelProps} from '../Panel';

interface PanelHeaderProps extends PanelProps {
    intent?: Intent;
}

/**
 * A standardized header for a Panel component
 * @internal
 */
export const panelHeader = hoistCmp.factory<PanelHeaderProps>({
    displayName: 'PanelHeader',
    className: 'xh-panel-header',
    model: false,
    memo: false,
    observer: false,

    render({className, title, icon, intent, headerItems = []}) {
        headerItems = headerItems ?? [];
        if (!title && !icon && isEmpty(headerItems)) return null;

        return hbox({
            className: classNames(
                className,
                intent ? ['xh-panel-header--intent', `xh-panel-header--intent-${intent}`] : null
            ),
            children: [
                icon || null,
                title
                    ? div({
                          className: 'xh-panel-header__title',
                          children: title
                      })
                    : filler(),
                ...headerItems
            ]
        });
    }
});
