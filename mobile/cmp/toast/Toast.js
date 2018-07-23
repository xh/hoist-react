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
 * A Toast. @see ToastModel for supported configuration options.
 *
 * This component is typical shown using
 * the XH.toast() convenience method (vs. needing to instantiate this component directly).
 */
@HoistComponent()
class Toast extends Component {

    render() {
        const {icon, message, timeout, intent} = this.model,
            cls = `xh-toast xh-intent-${intent}`;

        return onsenToast({
            isOpen: true,
            timeout: timeout,
            cls: cls,
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

    onDismissClick = () => {this.model.onDismiss()}

}
export const toast = elemFactory(Toast);
