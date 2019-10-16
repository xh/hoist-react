/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {LoginPanelModel} from '@xh/hoist/appcontainer/login/LoginPanelModel';
import {div, filler, form, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {page} from '@xh/hoist/mobile/cmp/page';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';

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
        const {loginMessage} = XH.appSpec;

        return page({
            className: 'xh-login',
            items: [
                toolbar(
                    filler(),
                    XH.clientAppName,
                    filler()
                ),
                vframe({
                    className: 'xh-login__body',
                    items: [
                        form({
                            className: 'xh-login__fields',
                            items: [
                                textInput({
                                    bind: 'username',
                                    placeholder: 'Username',
                                    autoComplete: 'username',
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
                            omit: !model.warning,
                            item: model.warning
                        }),
                        button({
                            icon: Icon.login(),
                            text: 'Login',
                            modifier: 'cta',
                            disabled: !model.isValid,
                            onClick: () => model.submit()
                        })
                    ]
                })
            ]
        });
    }
});