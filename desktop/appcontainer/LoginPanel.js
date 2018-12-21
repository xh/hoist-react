/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {text} from '@xh/hoist/kit/blueprint';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {vspacer, box, filler, viewport} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import {LoginPanelModel} from '@xh/hoist/core/appcontainer/LoginPanelModel';

import './LoginPanel.scss';

/**
 * A minimal username / password prompt for applications using form-based authentication.
 * Automatically created and displayed if required by AppContainer.
 *
 * @private
 */
@HoistComponent
export class LoginPanel extends Component {

    static modelClass = LoginPanelModel;

    render() {
        const {loginMessage} = XH.appSpec;
        const {model} = this;

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            items: [
                panel({
                    title: XH.clientAppName,
                    icon: Icon.login(),
                    className: 'xh-login',
                    width: 300,
                    items: [
                        vspacer(10),
                        textInput({
                            model,
                            field: 'username',
                            placeholder: 'Username...',
                            autoFocus: true,
                            commitOnChange: true,
                            onKeyPress: this.onKeyPress,
                            autoComplete: 'on'
                        }),
                        textInput({
                            model,
                            field: 'password',
                            placeholder: 'Password...',
                            type: 'password',
                            commitOnChange: true,
                            onKeyPress: this.onKeyPress,
                            autoComplete: 'on'
                        }),
                        text({
                            omit: !model.warning,
                            item: model.warning,
                            ellipsize: true,
                            className: 'xh-login__warning'
                        }),
                        loginMessage ? box({
                            className: 'xh-login__message',
                            item: loginMessage
                        }) : null
                    ],
                    bbar: toolbar(
                        filler(),
                        button({
                            text: 'Login',
                            intent: 'primary',
                            icon: Icon.login(),
                            disabled: !model.isValid,
                            onClick: this.onSubmit
                        })
                    )
                })
            ]
        });
    }

    onSubmit = () => {
        this.model.submit();
    };

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.onSubmit();
        }
    }
}
export const loginPanel = elemFactory(LoginPanel);