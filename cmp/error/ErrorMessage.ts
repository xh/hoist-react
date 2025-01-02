/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {BoxProps, hoistCmp, HoistProps, XH} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import {errorMessageImpl as desktopErrorMessageImpl} from '@xh/hoist/dynamics/desktop';
import {errorMessageImpl as mobileErrorMessageImpl} from '@xh/hoist/dynamics/mobile';
import type {ButtonProps as DesktopButtonProps} from '@xh/hoist/desktop/cmp/button';
import type {ButtonProps as MobileButtonProps} from '@xh/hoist/mobile/cmp/button';
import {isNil, isString} from 'lodash';
import {ReactNode} from 'react';
import './ErrorMessage.scss';

export interface ErrorMessageProps extends HoistProps, Omit<BoxProps, 'title'> {
    /**
     * If provided, will render a "Retry" button that calls this function.
     * Use `actionButtonProps` for further control over this button.
     */
    actionFn?: (error: unknown) => void;

    /**
     * If provided, component will render an inline action button - prompting to user to take some
     * action that might resolve the error, such as retrying a failed data load.
     */
    actionButtonProps?: DesktopButtonProps | MobileButtonProps;

    /**
     * If provided, will render a "Details" button that calls this function.
     * Use `detailsButtonProps` for further control over this button.  Default false.
     */
    detailsFn?: (error: unknown) => void;

    /**
     * If provided, component will render an inline details button.
     */
    detailsButtonProps?: DesktopButtonProps | MobileButtonProps;

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
            detailsButtonProps,
            ...rest
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

        return frame({
            ref,
            className,
            ...rest,
            item: XH.isMobileApp
                ? mobileErrorMessageImpl({
                      message,
                      title,
                      actionButtonProps,
                      detailsButtonProps
                  })
                : desktopErrorMessageImpl({
                      message,
                      title,
                      actionButtonProps,
                      detailsButtonProps
                  })
        });
    }
});
