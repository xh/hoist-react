/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {frame, div, p} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {isEmpty, isError, isString, isFunction} from 'lodash';
import {isValidElement} from 'react';
import PT from 'prop-types';

import './ErrorMessage.scss';

/**
 * Component for displaying an error with standardized styling.
 */
export const [ErrorMessage, errorMessage] = hoistCmp.withFactory({
    className: 'xh-error-message',
    render({className, error, title, actionFn, actionButtonProps}, ref) {
        if (!isError(error) && isEmpty(error)) return null;

        return frame({
            className,
            item: div({
                ref,
                className: 'xh-error-message__inner',
                items: [
                    titleCmp({title}),
                    errorCmp({error}),
                    actionButton({actionFn, actionButtonProps})
                ]
            })
        });
    }
});

ErrorMessage.propTypes = {
    /** Error to display. Either an exception, an element or a string. */
    error: PT.oneOfType([PT.instanceOf(Error), PT.element, PT.string]),

    /** Optional title to display above the error. Either an element or a string. */
    title: PT.oneOfType([PT.element, PT.string]),

    /** If provided, will render an action button which triggers this function,
     preconfigured with the text 'Retry' (see `actionButtonProps`) */
    actionFn: PT.func,

    /** Allows overriding the default properties of the action button. */
    actionButtonProps: PT.object
};

const titleCmp = hoistCmp.factory(
    ({title}) => {
        if (isValidElement(title)) return title;
        if (isString(title)) return div({className: 'xh-error-message__title', item: title});
        return null;
    }
);

const errorCmp = hoistCmp.factory(
    ({error}) => {
        if (error instanceof Error || error?.message) return p(error.message);
        if (isValidElement(error)) return error;
        if (isString(error)) return p(error);
        return null;
    }
);

const actionButton = hoistCmp.factory(
    ({actionFn, actionButtonProps}) => {
        if (!isFunction(actionFn)) return null;
        return button({
            text: 'Retry',
            minimal: false,
            onClick: () => actionFn(),
            ...actionButtonProps
        });
    }
);
