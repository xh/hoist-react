/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import { hoistCmp} from '@xh/hoist/core';
import { box, hbox, filler } from '@xh/hoist/cmp/layout';
import { button } from '@xh/hoist/desktop/cmp/button';
import { Icon } from '@xh/hoist/icon';

import './DialogHeader.scss';


export const dialogHeader = hoistCmp.factory({
    displayName: 'DialogHeader',

    render(props) {
        const {dialogModel, icon, title} = props,
            {resizable, draggable, showCloseButton} = dialogModel;

        if (!title && !icon && !resizable && !draggable && !showCloseButton) return null;

        return hbox({
            className: 'xh-dialog__header' + (draggable ? ' xh-dialog__header--draggable' : ''),
            items: [
                icon || null,
                title ?
                    box({
                        className: 'xh-dialog__header__title',
                        flex: 1,
                        item: title
                    }) :
                    filler(),
                maxMinButton({dialogModel}),
                closeButton({dialogModel})
            ]
        });

    }
});

const maxMinButton = hoistCmp.factory(
    ({dialogModel}) => {
        const {resizable, isMaximizedState} = dialogModel;
        return button({
            omit: !resizable,
            icon: !isMaximizedState ? Icon.expand() : Icon.collapse(),
            onClick: () => dialogModel.toggleIsMaximized()
        });
    }
);

const closeButton = hoistCmp.factory(
    ({dialogModel}) => {
        return button({
            omit: !dialogModel.showCloseButton,
            icon: Icon.close(),
            onClick: () => dialogModel.close()
        });
    }
);