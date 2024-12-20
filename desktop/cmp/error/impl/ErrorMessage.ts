/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {div, filler, hbox, p} from '@xh/hoist/cmp/layout';
import {ErrorMessageProps} from '@xh/hoist/cmp/error';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isString} from 'lodash';
import {isValidElement} from 'react';
import '@xh/hoist/desktop/register';

/**
 * Desktop implementation of ErrorMessage.
 * @internal
 */
export const errorMessageImpl = hoistCmp.factory<ErrorMessageProps>({
    render({error, message, title, actionButtonProps, detailsButtonProps}) {
        let buttons = [],
            buttonBar = null;
        if (detailsButtonProps) buttons.push(detailsButton(detailsButtonProps));
        if (actionButtonProps) buttons.push(actionButton(actionButtonProps));
        if (buttons.length == 1) {
            buttonBar = buttons[0];
        } else if (buttons.length == 2) {
            buttonBar = hbox(buttons[0], filler(), buttons[1]);
        }

        return div({
            className: 'xh-error-message__inner',
            items: [titleCmp({title}), messageCmp({message, error}), buttonBar]
        });
    }
});

const titleCmp = hoistCmp.factory(({title}) => {
    if (isValidElement(title)) return title;
    if (isString(title)) return div({className: 'xh-error-message__title', item: title});
    return null;
});

const messageCmp = hoistCmp.factory(({message}) => {
    if (isValidElement(message)) return message;
    if (isString(message)) return p(message);
    return null;
});

const actionButton = hoistCmp.factory<ButtonProps>(props => {
    return button({
        text: 'Retry',
        icon: Icon.refresh(),
        ...props
    });
});

const detailsButton = hoistCmp.factory<ButtonProps>(props => {
    return button({
        text: 'Details',
        icon: Icon.detail(),
        ...props
    });
});
