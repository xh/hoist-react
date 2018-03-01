/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './LoginPanel.css';
import {Component} from 'react';
import {XH, elemFactory, hoistComponent, hoistModel} from 'hoist/core';
import {vbox, hbox, filler, viewport} from 'hoist/layout';
import {inputGroup, button, text} from 'hoist/kit/blueprint';
import {observable, computed, setter} from 'hoist/mobx';
import {AlertModel, alert} from 'hoist/cmp';

@hoistComponent()
export class LoginPanel extends Component {

    @setter @observable username = '';
    @setter @observable password = '*****'; // Needed because saved password in chrome not triggering initial validation
    @setter @observable warning = '';
    exceptionAlert = new AlertModel();

    @computed get isValid() {
        return this.username && this.password;
    }

    render() {
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            cls: this.darkTheme ? 'xh-dark' : '',
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
                    alert({model: this.exceptionAlert})
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
            url: 'auth/loginn',
            params: {username, password}
        }).then(r => {
            hoistModel.markAuthenticatedUser(r.success ? username : null);
            this.setWarning(r.success ? '' : 'Login Failed.');
        }).catch(e => {
            hoistModel.markAuthenticatedUser(null);
            this.exceptionAlert.alert({
                title: 'Error' ,
                message: `There was an error executing the login: ${e.message || e.name}`
            });
        });
    }

    onUsernameChange = (ev) => {this.setUsername(ev.target.value)}
    onPasswordChange = (ev) => {this.setPassword(ev.target.value)}
}
export const loginPanel = elemFactory(LoginPanel);