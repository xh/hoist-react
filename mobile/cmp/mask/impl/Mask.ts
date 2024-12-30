/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {box, div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {MaskProps} from '@xh/hoist/cmp/mask';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import '@xh/hoist/mobile/register';
import './Mask.scss';

/**
 * Mobile implementation of Mask.
 * @internal
 */
export const maskImpl = hoistCmp.factory<MaskProps>({
    render({message, onClick, spinner = false, className}, ref) {
        return div({
            ref,
            onClick,
            className,
            item: vbox({
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
