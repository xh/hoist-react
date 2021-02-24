/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import copy from 'clipboard-copy';
import PT from 'prop-types';

/**
 * Button to copy text to the clipboard.
 */
export const [ClipboardButton, clipboardButton] = hoistCmp.withFactory({
    displayName: 'ClipboardButton',
    model: false,

    render(props) {
        let {icon, onClick, text, getCopyText, successMessage, ...rest} = props;

        if (!onClick) {
            onClick = async (e) => {
                const {successMessage, getCopyText} = props;

                try {
                    const text = await getCopyText();
                    await copy(text);
                    if (successMessage) {
                        XH.toast({
                            message: successMessage,
                            icon: Icon.clipboard()
                        });
                    }
                } catch (e) {
                    XH.handleException(e, {showAlert: false});
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

ClipboardButton.propTypes = {
    ...Button.propTypes,

    /** Function returning the text to copy.  May be async. */
    getCopyText: PT.func.isRequired,

    /** Message to be displayed in a toast when copy is complete. */
    successMessage: PT.string
};
