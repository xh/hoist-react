/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LoginPanelModel} from '@xh/hoist/appcontainer/login/LoginPanelModel';
import {box, div, form, viewport} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {panel} from '@xh/hoist/mobile/cmp/panel';
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
        const {loginMessage, loginPanelIcon, clientAppName} = XH.appSpec,
            {warning, loginInProgress} = model;

        return viewport(
            panel({
                className: 'xh-login',
                testId: 'xh-login',
                children: div({
                    className: 'xh-login__content',
                    children: [
                        box({
                            className: 'xh-login__icon',
                            children: loginPanelIcon ?? Icon.shieldHalved({prefix: 'fas'})
                        }),
                        div({className: 'xh-login__title', children: `Login to ${clientAppName}`}),
                        div({
                            className: 'xh-login__subtitle',
                            children: 'Enter your credentials to continue.'
                        }),
                        form({
                            className: 'xh-login__fields',
                            children: [
                                field({
                                    label: 'Username',
                                    input: textInput({
                                        bind: 'username',
                                        leftIcon: Icon.user(),
                                        autoComplete: 'username',
                                        enablePasswordManagers: true,
                                        autoCapitalize: 'none',
                                        commitOnChange: true,
                                        testId: 'xh-login-username'
                                    })
                                }),
                                field({
                                    label: 'Password',
                                    input: textInput({
                                        bind: 'password',
                                        leftIcon: Icon.lock(),
                                        type: 'password',
                                        autoComplete: 'current-password',
                                        enablePasswordManagers: true,
                                        commitOnChange: true,
                                        testId: 'xh-login-password'
                                    })
                                }),
                                div({
                                    className: 'xh-login__message',
                                    omit: !loginMessage,
                                    children: loginMessage
                                }),
                                div({
                                    className: 'xh-login__warning',
                                    omit: !warning,
                                    children: warning
                                }),
                                button({
                                    className: 'xh-login__submit',
                                    icon: loginInProgress
                                        ? Icon.spinner({spin: true})
                                        : Icon.login(),
                                    text: loginInProgress ? 'Logging in...' : 'Login',
                                    intent: 'primary',
                                    onClick: () => model.submitAsync(),
                                    testId: 'xh-login-btn'
                                })
                            ]
                        })
                    ]
                })
            })
        );
    }
});

const field = hoistCmp.factory({
    model: false,
    render({label, input}) {
        return div({
            className: 'xh-login__field',
            children: [div({className: 'xh-login__field-label', children: label}), input]
        });
    }
});
