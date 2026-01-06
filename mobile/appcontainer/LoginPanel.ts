/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LoginPanelModel} from '@xh/hoist/appcontainer/login/LoginPanelModel';
import {div, filler, form} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import './LoginPanel.scss';

/**
 * A minimal username / password prompt for applications using form-based authentication.
 * Automatically created and displayed if required by AppContainer.
 *
 * @internal
 */
export const loginPanel = hoistCmp.factory({
    displayName: 'LoginPanel',
    model: creates(LoginPanelModel),

    render({model}) {
        const {loginMessage} = XH.appSpec,
            {isValid, loadModel, warning, loginInProgress} = model;

        return panel({
            className: 'xh-login',
            items: [
                toolbar(filler(), XH.clientAppName, filler()),
                panel({
                    className: 'xh-login__body',
                    mask: loadModel,
                    items: [
                        form({
                            className: 'xh-login__fields',
                            items: [
                                textInput({
                                    bind: 'username',
                                    placeholder: 'Username',
                                    autoComplete: 'username',
                                    autoCapitalize: 'none',
                                    commitOnChange: true
                                }),
                                textInput({
                                    bind: 'password',
                                    placeholder: 'Password',
                                    autoComplete: 'current-password',
                                    type: 'password',
                                    commitOnChange: true
                                })
                            ]
                        }),
                        div({
                            className: 'xh-login__message',
                            omit: !loginMessage,
                            item: loginMessage
                        }),
                        div({
                            className: 'xh-login__warning',
                            omit: !warning,
                            item: warning
                        }),
                        button({
                            icon: Icon.login(),
                            text: loginInProgress ? 'Please wait...' : 'Login',
                            disabled: !isValid || loginInProgress,
                            onClick: () => model.submitAsync()
                        })
                    ]
                })
            ]
        });
    }
});
