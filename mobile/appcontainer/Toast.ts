/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import classNames from 'classnames';
import './Toast.scss';

/**
 * @internal
 */
export const toast = hoistCmp.factory({
    displayName: 'Toast',
    model: uses(ToastModel),

    render({model}) {
        const {icon, message, intent, actionButtonProps} = model;

        return div({
            className: classNames('xh-toast', intent ? `xh-toast--intent-${intent}` : null),
            item: div({
                className: 'xh-toast__content',
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
            })
        });
    }
});
