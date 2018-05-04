/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, hoistComponent} from 'hoist/core';
import {vframe, filler, viewport} from 'hoist/layout';
import {button, text} from 'hoist/kit/blueprint';
import {panel, textField, toolbar} from 'hoist/cmp';
import {observable, computed, setter} from 'hoist/mobx';
import {Icon} from 'hoist/icon';

import './LoginPanel.scss';

/**
 * A minimal username / password prompt for applications using form-based authentication.
 * Automatically created and displayed if required by AppContainer.
 */
@hoistComponent()
export class LoginPanel extends Component {

    @setter @observable username = '';
    @setter @observable password = '';
    @setter @observable warning = '';

    @computed get isValid() {
        return this.username && this.password;
    }

    render() {
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            item: panel({
                cls: 'xh-login',
                width: 300,
                title: `Welcome to ${XH.appName}`,
                item: vframe({
                    padding: 10,
                    items: [
                        textField({
                            model: this,
                            field: 'username',
                            placeholder: 'Username...',
                            autoFocus: true
                        }),
                        textField({
                            model: this,
                            field: 'password',
                            placeholder: 'Password...',
                            type: 'password'
                        }),
                        text({
                            item: this.warning,
                            ellipsize: true,
                            cls: 'xh-login__warning'
                        })
                    ]
                }),
                bottomToolbar: toolbar(
                    filler(),
                    button({
                        text: 'Login',
                        intent: 'primary',
                        icon: Icon.login(),
                        disabled: !this.isValid,
                        onClick: this.onSubmit
                    })
                )
            })
        });
    }


    //------------------------
    // Implementation
    //------------------------
    onSubmit = () => {
        const {username, password} = this;
        return XH.fetchJson({
            url: 'auth/login',
            params: {username, password}
        }).then(r => {
            this.setWarning(r.success ? '' : 'Login Incorrect');
            if (r.success) {
                XH.completeInitAsync(username);
            }
        }).catchDefault();
    }

    onUsernameChange = (ev) => {this.setUsername(ev.target.value)}
    onPasswordChange = (ev) => {this.setPassword(ev.target.value)}
}
export const loginPanel = elemFactory(LoginPanel);