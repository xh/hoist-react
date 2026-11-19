/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {useEffect, useState} from 'react';
import './Toast.scss';

/**
 * A single desktop toast. Its timeout pauses while the pointer is over it or focus is within it,
 * and starts over when the pointer leaves or focus moves out.
 * @internal
 */
export const toast = hoistCmp.factory({
    displayName: 'Toast',
    model: uses(ToastModel),

    render({model}) {
        const {icon, message, intent, timeout, actionButtonProps} = model,
            [isPaused, setIsPaused] = useState(false);

        useEffect(() => {
            if (isPaused || !(timeout > 0)) return;
            const id = setTimeout(() => model.dismiss(), timeout);
            return () => clearTimeout(id);
        }, [isPaused, timeout, model]);

        const pause = () => setIsPaused(true),
            resume = () => setIsPaused(false);

        return div({
            className: classNames(
                'xh-toast',
                intent && [`xh-toast--intent-${intent}`, `xh-bg-intent-${intent}`]
            ),
            tabIndex: 0,
            onMouseEnter: pause,
            onMouseLeave: resume,
            onFocus: pause,
            onBlur: resume,
            children: [
                div({className: 'xh-toast__icon', children: icon}),
                span({
                    className: 'xh-toast__message',
                    role: 'alert',
                    children: message
                }),
                div({
                    className: 'xh-toast__buttons xh-button-group xh-button-group--minimal',
                    children: [
                        actionButtonProps
                            ? button({
                                  ...actionButtonProps,
                                  intent: null,
                                  onClick: e => {
                                      actionButtonProps.onClick?.(e);
                                      model.dismiss();
                                  }
                              })
                            : null,
                        button({
                            icon: Icon.close(),
                            'aria-label': 'Close',
                            onClick: () => model.dismiss()
                        })
                    ]
                })
            ]
        });
    }
});
