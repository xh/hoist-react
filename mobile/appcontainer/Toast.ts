/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toast as onsenToast} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import './Toast.scss';

/**
 * @internal
 */
export const toast = hoistCmp.factory({
    displayName: 'Toast',
    model: uses(ToastModel),

    render({model}) {
        const {icon, message, intent, actionButtonProps} = model,
            cls = `xh-toast toast-bg-intent-${intent}`;

        return onsenToast({
            visible: true,
            className: cls,
            items: [
                icon,
                span(message),
                button({
                    omit: !actionButtonProps,
                    minimal: true,
                    ...actionButtonProps
                }),
                button({
                    icon: Icon.cross(),
                    minimal: true,
                    onClick: () => model.dismiss()
                })
            ]
        });
    }
});
