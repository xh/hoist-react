/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp, XH} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

import copy from 'clipboard-copy';

/**
 * Button to copy text to the clipboard.
 */
export const [ClipboardButton, clipboardButton] = hoistCmp.withFactory({
    displayName: 'ClipboardButton',

    render(props) {
        let {icon, onClick, text, getCopyText, successMessage, ...rest} = props;

        if (!onClick) {
            onClick = async (e) => {
                const {successMessage, getCopyText} = this.props;

                try {
                    await copy(getCopyText());
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

    /** Function returning the text to copy. */
    getCopyText: PT.func.isRequired,

    /** Message to be displayed in a toast when copy is complete. */
    successMessage: PT.string
};