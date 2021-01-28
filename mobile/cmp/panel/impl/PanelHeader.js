/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, filler, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';

/**
 * A standardized header for a Panel component
 * @private
 */
export const panelHeader = hoistCmp.factory({
    displayName: 'PanelHeader',
    className: 'xh-panel-header',
    model: false, memo: false, observer: false,

    render({className, title, icon, headerItems = []}) {
        if (!title && !icon && !headerItems.length) return null;

        return hbox({
            className,
            items: [
                icon || null,
                title ?
                    div({
                        className: 'xh-panel-header__title',
                        item: title
                    }) :
                    filler(),
                ...headerItems
            ]
        });
    }
});
