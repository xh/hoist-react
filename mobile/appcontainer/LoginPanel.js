/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {page} from '@xh/hoist/mobile/cmp/page';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {div, vframe, vbox, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {Icon} from '@xh/hoist/icon';

import './LoginPanel.scss';
import {LoginPanelModel} from '@xh/hoist/appcontainer/LoginPanelModel';

/**
 *
 * Support for Forms based authentication
 *
 * @private
 */
export const loginPanel = hoistCmp.factory({
    displayName: 'LoginPanel',
    model: uses(LoginPanelModel),

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
                        vbox({
                            className: 'xh-login__fields',
                            items: [
                                textInput({
                                    bind: 'username',
                                    placeholder: 'Username...',
                                    commitOnChange: true
                                }),
                                textInput({
                                    bind: 'password',
                                    placeholder: 'Password...',
                                    type: 'password',
                                    commitOnChange: true
                                })
                            ]
                        }),
                        div({
                            className: 'xh-login__warning',
                            omit: !model.warning,
                            item: model.warning
                        }),
                        div({
                            className: 'xh-login__message',
                            omit: !loginMessage,
                            item: loginMessage
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