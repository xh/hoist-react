/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {box, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {MaskProps} from '@xh/hoist/cmp/mask';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {Classes, overlay} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import '@xh/hoist/desktop/register';
import './Mask.scss';

/**
 * Desktop implementation of Mask.
 * @internal
 */
export const maskImpl = hoistCmp.factory<MaskProps>({
    render({message, onClick, inline = true, spinner = false, className}) {
        return overlay({
            className: classNames(className, Classes.OVERLAY_SCROLL_CONTAINER),
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: !inline,
            enforceFocus: !inline,
            item: vbox({
                onClick,
                className: 'xh-mask-body',
                items: [
                    spinner ? spinnerCmp() : null,
                    spinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
});
