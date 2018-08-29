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
import {textField} from '@xh/hoist/desktop/cmp/form';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './LoginPanel.scss';

/**
 * A minimal username / password prompt for applications using form-based authentication.
 * Automatically created and displayed if required by AppContainer.
 *
 * @private
 */
@HoistComponent()
export class LoginPanel extends Component {

    render() {
        const {loginMessage} = XH.app;
        const {model} = this;

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            items: [
                panel({
                    className: 'xh-login',
                    width: 300,
                    title: `Welcome to ${XH.appName}`,
                    items: [
                        vspacer(10),
                        textField({
                            model,
                            field: 'username',
                            placeholder: 'Username...',
                            autoFocus: true,
                            commitOnChange: true,
                            handleKeyPress: this.handleKeyPress
                        }),
                        textField({
                            model,
                            field: 'password',
                            placeholder: 'Password...',
                            type: 'password',
                            commitOnChange: true,
                            handleKeyPress: this.handleKeyPress
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

    handleKeyPress = (key) => {
        if (key === 'Enter') {
            this.onSubmit()
        }
    }
}
export const loginPanel = elemFactory(LoginPanel);