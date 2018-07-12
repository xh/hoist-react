/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {page, toolbar} from '@xh/hoist/kit/onsen';
import {div, vframe, vbox} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textField} from '@xh/hoist/mobile/cmp/form';
import {observable, computed, setter} from '@xh/hoist/mobx';
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

    @setter @observable username = '';
    @setter @observable password = '';
    @setter @observable warning = '';

    @computed
    get isValid() {
        return this.username && this.password;
    }

    render() {
        const {loginMessage} = XH.app;

        return page({
            renderToolbar: () => toolbar(
                div({
                    cls: 'center',
                    item: `Welcome to ${XH.appName}`
                })
            ),
            items: [
                vframe({
                    cls: 'xh-login',
                    items: [
                        vbox({
                            cls: 'xh-login__fields',
                            items: [
                                textField({
                                    model: this,
                                    field: 'username',
                                    placeholder: 'Username...',
                                    commitOnChange: true
                                }),
                                textField({
                                    model: this,
                                    field: 'password',
                                    placeholder: 'Password...',
                                    type: 'password',
                                    commitOnChange: true
                                })
                            ]
                        }),
                        div({
                            cls: 'xh-login__warning',
                            omit: !this.warning,
                            item: this.warning
                        }),
                        div({
                            cls: 'xh-login__message',
                            omit: !loginMessage,
                            item: loginMessage
                        }),
                        button({
                            icon: Icon.login(),
                            text: 'Login',
                            modifier: 'cta',
                            disabled: !this.isValid,
                            onClick: this.onSubmit
                        })
                    ]
                })
            ]
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
                XH.completeInitAsync();
            }
        }).catchDefault({
            hideParams: ['password']
        });
    }

}
export const loginPanel = elemFactory(LoginPanel);