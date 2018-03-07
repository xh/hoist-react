/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './LoginPanel.css';
import React, {Component} from 'react';
import {XH, elemFactory, hoistComponent, hoistModel} from 'hoist/core';
import {vbox, hbox, filler, viewport} from 'hoist/layout';
import {inputGroup, button, text} from 'hoist/kit/blueprint';
import {observable, computed, setter} from 'hoist/mobx';
import {MessageModel, message} from 'hoist/cmp';

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
                cls: 'xh-ba xh-pa',
                justifyContent: 'right',
                width: 300,
                items: [
                    inputGroup({
                        placeholder: 'Username...',
                        autoFocus: true,
                        value: this.username,
                        onChange: this.onUsernameChange,
                        cls: 'xh-mb'
                    }),
                    inputGroup({
                        placeholder: 'Password...',
                        value: this.password,
                        type: 'password',
                        rightElement: button({icon: 'lock', disabled: true}),
                        onChange: this.onPasswordChange,
                        cls: 'xh-mb'
                    }),
                    text({
                        item: this.warning,
                        ellipsize: true,
                        cls: 'xh-mb xh-login-warning'
                    }),
                    hbox(
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