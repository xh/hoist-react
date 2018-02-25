/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH} from 'hoist/app';
import {elemFactory} from 'hoist/react';
import {vbox, hbox, filler, viewport} from 'hoist/layout';
import {inputGroup, button} from 'hoist/kit/blueprint';
import {observable, computed, observer, setter} from 'hoist/mobx';

import {hoistAppModel} from '../HoistAppModel';

@observer
export class LoginPanel extends Component {

    @setter @observable username = '';
    @setter @observable password = '*****'; // Needed because saved password in chrome not triggering initial validation

    @computed get isValid() {
        return this.username && this.password;
    }

    render() {
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            cls: hoistAppModel.darkTheme ? 'xh-dark' : '',
            item: vbox({
                cls: 'xh-ba xh-pa',
                justifyContent: 'right',
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
                    hbox(
                        filler(),
                        button({
                            text: 'Go',
                            intent: 'primary',
                            disabled: !this.isValid,
                            onClick: this.onSubmit
                        })
                    )
                ]
            })
        });
    }


    //--------------------------------
    // Implementation
    //--------------------------------
    onSubmit = () => {
        return XH.fetchJson({
            url: 'auth/login',
            params: {
                username: this.username,
                password: this.password
            }
        }).then(r => {
            hoistAppModel.markAuthenticatedUser(r.success ? this.username : null);
        }).catch(() => {
            hoistAppModel.markAuthenticatedUser(null);
        });
    }

    onUsernameChange = (ev) => {this.setUsername(ev.target.value)}
    onPasswordChange = (ev) => {this.setPassword(ev.target.value)}
}
export const loginPanel = elemFactory(LoginPanel);