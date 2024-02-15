/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, filler, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {isEmpty} from 'lodash';
import {PanelProps} from '../Panel';

/**
 * A standardized header for a Panel component
 * @internal
 */
export const panelHeader = hoistCmp.factory<PanelProps>({
    displayName: 'PanelHeader',
    className: 'xh-panel-header',
    model: false,
    memo: false,
    observer: false,

    render({className, title, icon, headerItems = []}) {
        headerItems = headerItems ?? [];
        if (!title && !icon && isEmpty(headerItems)) return null;

        return hbox({
            className,
            items: [
                icon || null,
                title
                    ? div({
                          className: 'xh-panel-header__title',
                          item: title
                      })
                    : filler(),
                ...headerItems
            ]
        });
    }
});
