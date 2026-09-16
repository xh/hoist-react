/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {copyToClipboard, withDefault} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

/**
 * Config for the copy behavior shared by {@link ClipboardButton} and {@link ClipboardMenuItem}.
 */
export interface CopyTextSpec {
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
 * Build the click handler shared by the clipboard button and menu item.
 * @internal
 */
export function createCopyHandler({getCopyText, errorMessage, successMessage}: CopyTextSpec) {
    let errMsg = withDefault(errorMessage, true),
        successMsg = withDefault(successMessage, false);

    return async () => {
        try {
            const copyText = await getCopyText();
            await copyToClipboard(copyText);
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
