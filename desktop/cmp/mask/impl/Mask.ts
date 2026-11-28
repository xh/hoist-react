/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {box, div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import type {MaskProps} from '@xh/hoist/cmp/mask';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {OVERLAY_SCROLL_CONTAINER, overlay} from '@xh/hoist/desktop/cmp/dialog/impl/Overlay';
import classNames from 'classnames';
import '@xh/hoist/desktop/register';
import './Mask.scss';

/**
 * Desktop implementation of Mask.
 * @internal
 */
export const maskImpl = hoistCmp.factory<MaskProps>({
    model: false,
    render({message, onClick, inline = true, spinner = false, className}) {
        const body = vbox({
            onClick,
            className: 'xh-mask-body',
            children: [
                spinner ? spinnerCmp() : null,
                spinner ? vspacer(10) : null,
                message ? box({className: 'xh-mask-text', children: message}) : null
            ]
        });

        // An inline mask is a plain div, which shows without forcing a layout.
        if (inline) {
            return div({
                className: classNames(className, 'xh-mask--inline'),
                'aria-live': 'polite',
                children: body
            });
        }

        return overlay({
            className: classNames(className, OVERLAY_SCROLL_CONTAINER),
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            children: body
        });
    }
});
