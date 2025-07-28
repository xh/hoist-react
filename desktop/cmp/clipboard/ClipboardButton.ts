/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import copy from 'clipboard-copy';
import {isString} from 'lodash';

export interface ClipboardButtonProps extends ButtonProps {
    /** Function returning the text to copy. May be async. */
    getCopyText: () => string | Promise<string>;

    /**
     * Message to be displayed in a toast should the copy operation fail, or `true` (default) to
     * show a toast-based alert from `XH.handleException`. Spec `false` to fail silently.
     */
    errorMessage?: string | boolean;

    /**
     * Message to be displayed in a toast when copy is complete, or `true` for a default success
     * confirmation. Default `false`
     */
    successMessage?: string | boolean;
}

/**
 * Button to copy text to the clipboard.
 */
export const [ClipboardButton, clipboardButton] = hoistCmp.withFactory<ClipboardButtonProps>({
    displayName: 'ClipboardButton',
    model: false,

    render(props) {
        let {icon, onClick, text, getCopyText, errorMessage, successMessage, ...rest} = props;
        let errMsg = withDefault(errorMessage, true),
            successMsg = withDefault(successMessage, false);

        if (!onClick) {
            onClick = async () => {
                try {
                    const copyText = await getCopyText();
                    await copy(copyText);
                    if (successMsg) {
                        successMsg = isString(successMsg) ? successMsg : 'Copied to clipboard';
                        XH.toast({
                            icon: Icon.clipboard(),
                            message: successMsg
                        });
                    }
                } catch (e) {
                    if (errMsg) {
                        errMsg = isString(errMsg) ? errMsg : 'Error copying to clipboard';
                        XH.dangerToast({
                            icon: Icon.clipboard(),
                            message: errMsg
                        });
                    }
                    XH.handleException(e, {
                        message: 'Error copying to clipboard',
                        showAlert: false
                    });
                }
            };
        }

        return button({
            icon: withDefault(icon, Icon.clipboard()),
            text: withDefault(text, 'Copy'),
            onClick,
            ...rest
        });
    }
});
