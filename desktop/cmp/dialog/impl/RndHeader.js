/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {box, hbox, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {DialogModel} from '../DialogModel';
import './RndHeader.scss';

/**
 * @private
 *
 * Header display for Dialog.
 */
export const rndHeader = hoistCmp.factory({
    model: uses(DialogModel),

    render({model, icon, title}) {
        const {draggable, showCloseButton} = model;

        if (!title && !icon && !showCloseButton) return null;

        return hbox({
            className: 'xh-dialog__header' + (draggable ? ' xh-dialog__header--draggable' : ''),
            items: [
                icon ?? null,
                title ?
                    box({className: 'xh-dialog__header__title', flex: 1, item: title}) :
                    filler(),
                maxMinButton(),
                closeButton()
            ]
        });
    }
});

//-------------------
// Helper Components
//-------------------
const maxMinButton = hoistCmp.factory(
    ({model}) => {
        return button({
            omit: !model.resizable,
            icon: model.isMaximized ? Icon.collapse() : Icon.expand(),
            onClick: () => model.toggleMaximized()
        });
    }
);

const closeButton = hoistCmp.factory(
    ({model}) => {
        return button({
            omit: !model.showCloseButton,
            icon: Icon.close(),
            onClick: () => model.close()
        });
    }
);