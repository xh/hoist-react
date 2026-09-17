/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import {createCopyHandler, type CopyTextSpec} from '@xh/hoist/cmp/clipboard';

export interface ClipboardButtonProps extends ButtonProps, CopyTextSpec {}

/**
 * Button to copy text to the clipboard.
 */
export const [ClipboardButton, clipboardButton] = hoistCmp.withFactory<ClipboardButtonProps>({
    displayName: 'ClipboardButton',
    model: false,

    render(props) {
        const {icon, onClick, text, getCopyText, errorMessage, successMessage, ...rest} = props;

        return button({
            icon: withDefault(icon, Icon.clipboard()),
            text: withDefault(text, 'Copy'),
            onClick: onClick ?? createCopyHandler({getCopyText, errorMessage, successMessage}),
            ...rest
        });
    }
});
