/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import { hoistCmp, useContextModel } from '@xh/hoist/core';
import { box, hbox, filler } from '@xh/hoist/cmp/layout';

import './DialogHeader.scss';
import { button } from '@xh/hoist/desktop/cmp/button';
import { Icon } from '@xh/hoist/icon';
import classNames from 'classnames';
import { DialogModel } from '../DialogModel';

export const dialogHeader = hoistCmp.factory({
    displayName: 'DialogHeader',
    model: false,
    className: 'xh-dialog-header',

    render({ className, icon, title}) {
        const dialogModel = useContextModel(DialogModel),
            {resizable, draggable, showCloseButton} = dialogModel;

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
                closeButton({dialogModel})
            ]
        });

    }
});


const closeButton = hoistCmp.factory(
    ({dialogModel}) => button({
        icon: Icon.close(),
        onClick: () => dialogModel.hide()
    })
);