/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {toast as onsenToast} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import {span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';

import './Toast.scss';
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';

/**
 * Display an instance of ToastModel.
 *
 * @private
 */
export const toast = hoistCmp.factory({
    displayName: 'Toast',
    model: uses(ToastModel),

    render({model}) {
        const {icon, message, intent} = model,
            cls = `xh-toast xh-intent-${intent}`;

        return onsenToast({
            isOpen: true,
            className: cls,
            style: {height: window.innerHeight + 'px'},
            items: [
                icon,
                span(message),
                button({
                    icon: Icon.cross(),
                    modifier: 'quiet',
                    onClick: () => model.dismiss()
                })
            ]
        });
    }
});