/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import { hoistCmp } from '@xh/hoist/core';
import { box, hbox, filler } from '@xh/hoist/cmp/layout';

import './DialogHeader.scss';
import { button } from '@xh/hoist/desktop/cmp/button';
import { Icon } from '@xh/hoist/icon';
import classNames from 'classnames';

export const dialogHeader = hoistCmp.factory({
    displayName: 'DialogHeader',
    className: 'xh-dialog-header',

    render({model, className, icon, title}) {
        const {resizable, draggable, showCloseButton} = model;

        if (!title && !icon && !resizable && !draggable && !showCloseButton) return null;

        return hbox({
            className: classNames(className),
            items: [
                icon || null,
                title ?
                    box({
                        className: 'xh-dialog-header__title',
                        flex: 1,
                        item: title
                    }) :
                    filler(),
                maxMinButton(),
                closeButton()
            ]
        });

    }
});

const maxMinButton = hoistCmp.factory(
    ({model}) => {
        const {resizable, isMaximizedState} = model;
        return button({
            omit: !resizable,
            icon: !isMaximizedState ? Icon.expand() : Icon.collapse(),
            onClick: () => model.toggleIsMaximized()
        });
    }
);

const closeButton = hoistCmp.factory(
    ({model}) => button({
        omit: !model.showCloseButton,
        icon: Icon.close(),
        onClick: () => model.hide()
    })
);