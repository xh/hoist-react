/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {XH, elemFactory, hoistComponent, hoistModel} from 'hoist/core';
import {vbox, filler, viewport} from 'hoist/layout';
import {button, text} from 'hoist/kit/blueprint';
import {textField, toolbar} from 'hoist/cmp';
import {observable, computed, setter} from 'hoist/mobx';
import {MessageModel, message} from 'hoist/cmp';

import './LoginPanel.scss';

@hoistComponent()
export class LoginPanel extends Component {

    @setter @observable username = 'admin@xh.io';
    @setter @observable password = 'onBQs!!En93E3Wbj';
    @setter @observable warning = '';
    messageModel = new MessageModel();

    @computed get isValid() {
        return this.username && this.password;
    }

    render() {
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            item: vbox({
                cls: 'xh-login-panel',
                justifyContent: 'right',
                width: 300,
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
                        cls: 'xh-login-warning'
                    }),
                    toolbar(
                        filler(),
                        button({
                            text: 'Go',
                            intent: 'primary',
                            disabled: !this.isValid,
                            onClick: this.onSubmit
                        })
                    ),
                    message({model: this.messageModel})
                ]
            })
        });
    }
    
    //--------------------------------
    // Implementation
    //--------------------------------
    onSubmit = () => {
        const {username, password} = this;
        return XH.fetchJson({
            url: 'auth/login',
            params: {username, password}
        }).then(r => {
            hoistModel.markAuthenticatedUser(r.success ? username : null);
            this.setWarning(r.success ? '' : 'Login Incorrect.');
        }).catch(e => {
            hoistModel.markAuthenticatedUser(null);
            this.messageModel.alert({
                title: 'Error',
                icon: 'error',
                message:
                    <div>
                        An error occurred executing the login: <br/><br/>
                        <b> {e.message || e.name} </b>
                    </div>
            });
        });
    }

    onUsernameChange = (ev) => {this.setUsername(ev.target.value)}
    onPasswordChange = (ev) => {this.setPassword(ev.target.value)}
}
export const loginPanel = elemFactory(LoginPanel);