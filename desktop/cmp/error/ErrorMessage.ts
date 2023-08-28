/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {div, frame, p} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, PlainObject, TestSupportProps} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {isEmpty, isNil, isString} from 'lodash';
import {isValidElement, MouseEvent, ReactNode} from 'react';

import './ErrorMessage.scss';

export interface ErrorMessageProps extends HoistProps, TestSupportProps {
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
     * Error to display. If undefined, this component will look for an error property on its model.
     * If no error is found, this component will not be displayed.
     */
    error?: Error | string | PlainObject;
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
    render(
        {
            className,
            model,
            error = (model as any)?.error,
            message,
            title,
            testId,
            actionFn,
            actionButtonProps
        },
        ref
    ) {
        if (actionFn) {
            actionButtonProps = {...actionButtonProps, onClick: actionFn};
        }

        if (isNil(error)) return null;

        if (!message) {
            if (isString(error)) {
                message = error as any;
            } else if (error.message) {
                message = error.message;
            }
        }

        return frame({
            className,
            testId,
            item: div({
                ref,
                className: 'xh-error-message__inner',
                items: [titleCmp({title}), messageCmp({message}), actionButton({actionButtonProps})]
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

const actionButton = hoistCmp.factory(({actionButtonProps}) => {
    if (isEmpty(actionButtonProps)) return null;
    return button({
        text: 'Retry',
        minimal: false,
        ...actionButtonProps
    });
});
