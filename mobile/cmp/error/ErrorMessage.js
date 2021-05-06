/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {frame, div, p} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {apiDeprecated} from '@xh/hoist/utils/js';
import {isString, isEmpty, isNil} from 'lodash';
import {isValidElement} from 'react';
import PT from 'prop-types';

import './ErrorMessage.scss';

/**
 * Component for displaying an error with standardized styling.
 */
export const [ErrorMessage, errorMessage] = hoistCmp.withFactory({
    className: 'xh-error-message',
    render({
        className,
        model,
        error = model?.error,
        message,
        title,
        actionFn,
        actionButtonProps
    }, ref) {
        apiDeprecated(actionFn, 'actionFn', "Use 'actionButtonProps' instead");
        if (actionFn) {
            actionButtonProps = {...actionButtonProps, onClick: actionFn};
        }

        if (isNil(error)) return null;

        if (!message) {
            if (isString(error)) {
                message = error;
            } else if (error.message) {
                message = error.message;
            }
        }
        return frame({
            ref,
            className,
            item: div({
                className: 'xh-error-message__inner',
                items: [
                    titleCmp({title}),
                    messageCmp({message}),
                    actionButton({actionButtonProps})
                ]
            })
        });
    }
});

ErrorMessage.propTypes = {
    /**
     * If provided, component will render an inline action button - prompting to user to take some
     * action that might resolve the error, such as retrying a failed data load. Accepts all props
     * suitable for `Button`.
     */
    actionButtonProps: PT.object,

    /**
     *  Error to display. If undefined, this component will look for an error property on its model.
     *  If no error is found, this component will not be displayed.
     */
    error: PT.oneOfType([PT.instanceOf(Error), PT.object,  PT.string]),

    /**
     *  Message to display for the error.
     *  Defaults to the error, or any 'message' property contained within it.
     */
    message: PT.oneOfType([PT.element, PT.string]),

    /** Optional title to display above the message. */
    title: PT.oneOfType([PT.element, PT.string])
};

const titleCmp = hoistCmp.factory(
    ({title}) => {
        if (isValidElement(title)) return title;
        if (isString(title)) return div({className: 'xh-error-message__title', item: title});
        return null;
    }
);

const messageCmp = hoistCmp.factory(
    ({message}) => {
        if (isValidElement(message)) return message;
        if (isString(message)) return p(message);
        return null;
    }
);

const actionButton = hoistCmp.factory(
    ({actionButtonProps}) => {
        if (isEmpty(actionButtonProps)) return null;
        return button({
            text: 'Retry',
            ...actionButtonProps
        });
    }
);
