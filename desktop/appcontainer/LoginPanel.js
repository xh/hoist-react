/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {LoginPanelModel} from '@xh/hoist/appcontainer/login/LoginPanelModel';
import {div, filler, form, viewport, vspacer} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

import './LoginPanel.scss';

/**
 * A minimal username / password prompt for applications using form-based authentication.
 * Automatically created and displayed if required by AppContainer.
 *
 * @private
 */
export const loginPanel = hoistCmp.factory({
    displayName: 'LoginPanel',
    model: creates(LoginPanelModel),

    render({model}) {
        const {loginMessage} = XH.appSpec,
            {warning} = model;

        const onKeyDown = (ev) => {
            if (ev.key === 'Enter') model.submit();
        };

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            item: panel({
                title: XH.clientAppName,
                icon: Icon.login(),
                className: 'xh-login',
                width: 300,
                items: [
                    vspacer(10),
                    form(
                        textInput({
                            bind: 'username',
                            placeholder: 'Username',
                            autoComplete: 'username',
                            autoFocus: true,
                            commitOnChange: true,
                            onKeyDown,
                            width: null
                        }),
                        textInput({
                            bind: 'password',
                            placeholder: 'Password...',
                            autoComplete: 'current-password',
                            type: 'password',
                            commitOnChange: true,
                            onKeyDown,
                            width: null
                        })
                    ),
                    div({
                        item: loginMessage,
                        omit: !loginMessage,
                        className: 'xh-login__message'
                    }),
                    div({
                        item: warning,
                        omit: !warning,
                        className: 'xh-login__warning'
                    })
                ],
                bbar: [
                    filler(),
                    button({
                        text: 'Login',
                        intent: 'primary',
                        icon: Icon.login(),
                        disabled: !model.isValid,
                        onClick: () => model.submit()
                    })
                ]
            })
        });
    }
});
