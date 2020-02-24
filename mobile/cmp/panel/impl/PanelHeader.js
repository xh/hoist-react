/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {hbox, div, filler} from '@xh/hoist/cmp/layout';

/**
 * A standardized header for a Panel component
 * @private
 */
export const panelHeader = hoistCmp.factory({
    displayName: 'PanelHeader',
    className: 'xh-panel__header',
    model: false, memo: false, observer: false,

    render({className, title, icon, headerItems = []}) {

        if (!title && !icon && !headerItems.length) return null;

        return hbox({
            className,
            items: [
                icon || null,
                title ?
                    div({
                        className: 'xh-panel__header__title',
                        flex: 1,
                        item: title
                    }) :
                    filler(),
                ...headerItems
            ]
        });
    }
});
