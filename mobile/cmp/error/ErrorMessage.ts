/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, filler, frame, hbox, p} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, HoistProps} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {isNil, isString} from 'lodash';
import {isValidElement, ReactNode, MouseEvent} from 'react';

import './ErrorMessage.scss';
import {Icon} from '@xh/hoist/icon';

export interface ErrorMessageProps extends HoistProps<HoistModel, HTMLDivElement> {
    /**
     * If provided, will render a "Retry" button that calls this function.
     * Use `actionButtonProps` for further control over this button.
     */
    actionFn?: (e: MouseEvent) => void;

    /**
     * If provided, component will render an inline action button - prompting to user to take some
     * action that might resolve the error, such as retrying a failed data load.
     */
    actionButtonProps?: ButtonProps;

    /**
     * If provided, will render a "Details" button that calls this function.
     * Use `detailsButtonProps` for further control over this button.  Default false.
     */
    detailsFn?: (error: unknown) => void;

    /**
     * If provided, component will render an inline details button.
     */
    detailsButtonProps?: ButtonProps;

    /**
     * Error to display. If undefined, this component will look for an error property on its model.
     * If no error is found, this component will not be displayed.
     */
    error?: unknown;

    /**
     * Message to display for the error.
     * Defaults to the error, or any 'message' property contained within it.
     */
    message?: ReactNode;

    /** Optional title to display above the message. */
    title?: ReactNode;
}

/**
 * Component for displaying an error with standardized styling.
 */
export const [ErrorMessage, errorMessage] = hoistCmp.withFactory<ErrorMessageProps>({
    className: 'xh-error-message',
    render(props, ref) {
        let {
            className,
            model,
            error = model?.['error'],
            message,
            title,
            actionFn,
            actionButtonProps,
            detailsFn,
            detailsButtonProps
        } = props;

        if (isNil(error)) return null;

        if (!message) {
            if (isString(error)) {
                message = error;
            } else {
                message = error.message || error.name || 'Unknown Error';
            }
        }

        if (actionFn) {
            actionButtonProps = {...actionButtonProps, onClick: () => actionFn(error)};
        }

        if (detailsFn) {
            detailsButtonProps = {...detailsButtonProps, onClick: () => detailsFn(error)};
        }

        let buttons = [],
            buttonBar = null;
        if (detailsButtonProps) buttons.push(detailsButton(detailsButtonProps));
        if (actionButtonProps) buttons.push(actionButton(actionButtonProps));
        if (buttons.length == 1) {
            buttonBar = buttons[0];
        } else if (buttons.length == 2) {
            buttonBar = hbox(buttons[0], filler(), buttons[1]);
        }

        return frame({
            ref,
            className,
            item: div({
                className: 'xh-error-message__inner',
                items: [titleCmp({title}), messageCmp({message, error}), buttonBar]
            })
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
        text: 'Show Details',
        icon: Icon.detail(),
        ...props
    });
});
