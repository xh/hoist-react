/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {toast as onsenToast} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import {span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';

import './Toast.scss';

/**
 * Display an instance of ToastModel.
 *
 * @private
 */
@HoistComponent()
export class Toast extends Component {

    render() {
        const {icon, message, timeout, intent} = this.model,
            cls = `xh-toast xh-intent-${intent}`;

        return onsenToast({
            isOpen: true,
            timeout: timeout,
            className: cls,
            items: [
                icon,
                span(message),
                button({
                    icon: Icon.cross(),
                    modifier: 'quiet',
                    onClick: this.onDismissClick
                })
            ]
        });
    }

    onDismissClick = () => this.model.dismiss()

}
export const toast = elemFactory(Toast);
