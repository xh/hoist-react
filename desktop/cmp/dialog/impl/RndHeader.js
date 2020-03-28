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

import {RndModel} from './RndModel';
import './RndHeader.scss';

/**
 * @private
 *
 * Header display for Dialog.
 */
export const rndHeader = hoistCmp.factory({
    model: uses(RndModel),

    render({model, icon, title}) {
        const {resizable, draggable, showCloseButton} = model.dm;

        if (!title && !icon && !resizable && !draggable && !showCloseButton) return null;

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
        const {dm} = model;

        return button({
            omit: !dm.resizable,
            icon: dm.isMaximized ? Icon.collapse() : Icon.expand(),
            onClick: () => dm.toggleMaximized()
        });
    }
);

const closeButton = hoistCmp.factory(
    ({model}) => {
        const {dm} = model;
        return button({
            omit: !dm.showCloseButton,
            icon: Icon.close(),
            onClick: () => dm.close()
        });
    }
);