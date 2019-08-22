/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {text} from '@xh/hoist/kit/blueprint';
import {XH, hoistComponentFactory, useProvidedModel} from '@xh/hoist/core';
import {vspacer, box, filler, viewport} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {textInput} from '@xh/hoist/desktop/cmp/input';
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
export const loginPanel = hoistComponentFactory(
    (props) => {
        const model = useProvidedModel(LoginPanelModel, props),
            {loginMessage} = XH.appSpec;

        const onKeyDown = (ev) => {
            if (ev.key === 'Enter') model.submit();
        };

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            item: panel({
                title: XH.clientAppName,
                icon: Icon.login(),
                className: 'xh-login',
                width: 300,
                items: [
                    vspacer(10),
                    textInput({
                        model,
                        bind: 'username',
                        placeholder: 'Username...',
                        autoFocus: true,
                        commitOnChange: true,
                        onKeyDown,
                        autoComplete: 'on',
                        width: null
                    }),
                    textInput({
                        model,
                        bind: 'password',
                        placeholder: 'Password...',
                        type: 'password',
                        commitOnChange: true,
                        onKeyDown,
                        autoComplete: 'on',
                        width: null
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
                bbar: [
                    filler(),
                    button({
                        text: 'Login',
                        intent: 'primary',
                        icon: Icon.login(),
                        disabled: !model.isValid,
                        onClick: () => model.submit()
                    })
                ]
            })
        });
    }
);
