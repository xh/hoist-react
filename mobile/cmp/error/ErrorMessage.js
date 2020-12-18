/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {frame, div, p} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {isString, isFunction} from 'lodash';
import {isValidElement} from 'react';
import PT from 'prop-types';

import './ErrorMessage.scss';

/**
 * Component for displaying an error message with standardized styling.
 */
export const [ErrorMessage, errorMessage] = hoistCmp.withFactory({
    className: 'xh-error-message',
    render({className, message, actionFn, actionIcon, actionText}) {
        return frame({
            className,
            item: div({
                className: 'xh-error-message__inner',
                items: [
                    messageCmp({message}),
                    actionButton({actionFn, actionIcon, actionText})
                ]
            })
        });
    }
});

ErrorMessage.propTypes = {
    /** Content to display. Either an exception, an element or a string */
    message: PT.oneOfType([PT.instanceOf(Error), PT.element, PT.string]).isRequired,

    /** If provided, will render an action button which triggers this function. */
    actionFn: PT.func,

    /** Icon for the button generated for actionFn */
    actionIcon: PT.element,

    /** Text for the button generated for actionFn. Defaults to 'Retry' */
    actionText: PT.string
};

const messageCmp = hoistCmp.factory(
    ({message}) => {
        if (message instanceof Error || message?.message) return p(message.message);
        if (isValidElement(message)) return message;
        if (isString(message)) return p(message);
        return null;
    }
);

const actionButton = hoistCmp.factory(
    ({actionFn, actionIcon, actionText}) => {
        if (!isFunction(actionFn)) return null;
        return button({
            icon: actionIcon,
            text: actionText ?? 'Retry',
            onClick: () => actionFn()
        });
    }
);