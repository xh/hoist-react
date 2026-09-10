/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ExceptionHandlerOptions, HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isFunction} from 'lodash';
import {ReactNode} from 'react';

export interface ErrorBoundaryConfig {
    /**
     * Config for {@link XH.handleException}, or a custom function to handle any error caught by
     * the boundary. Defaults to `{showAlert: false}`.
     */
    errorHandler?: ExceptionHandlerOptions | ((e: unknown) => void);

    /**
     * Function to render any error caught by the boundary - return will be rendered in lieu of the
     * component's normal children. Defaults to a platform-appropriate {@link ErrorMessage}.
     */
    errorRenderer?: (e: unknown) => ReactNode;
}

/**
 * Model for an ErrorBoundary component that catches unhandled React lifecycle errors.
 *
 * Tracks a caught error and provides {@link handleError} for applications to programmatically
 * trigger error display for non-lifecycle exceptions. Use {@link showError} to display an
 * already-handled error without re-running the error handler.
 *
 * Configure via `errorHandler` to customize exception handling (defaults to suppressing the
 * alert dialog) and `errorRenderer` to customize the error display.
 *
 * @see ErrorBoundary
 */
export class ErrorBoundaryModel extends HoistModel {
    errorHandler: ExceptionHandlerOptions | ((e: unknown) => void);
    errorRenderer: (e: unknown) => ReactNode;

    /**
     * Caught error being displayed instead of the content.
     * Null if content rendering normally.
     */
    @observable.ref accessor error: unknown;

    constructor(config?: ErrorBoundaryConfig) {
        super();
        this.errorHandler = config?.errorHandler ?? {showAlert: false};
        this.errorRenderer = config?.errorRenderer;
    }

    /**
     * Handle the exception and replace the contents of the component with a rendered error.
     *
     * This method does not need to be called for React Lifecycle events that occur within its
     * rendered content - that is handled automatically by the component. It is publicly available
     * for apps that wish to use this component to handle and display other caught exceptions.
     *
     * For exceptions that have already been handled, call {@link showError} instead.
     */
    @action
    handleError(e: unknown) {
        let handler = this.errorHandler;
        if (handler) {
            isFunction(handler) ? handler(e) : XH.handleException(e, handler as any);
        }
        this.error = e;
    }

    /**
     * Replace the contents of the component with a rendered error.
     *
     * Note that unlike {@link handleError} this method will *not* report or take any other action
     * on the error. It is intended for use with exceptions that have already been handled.
     */
    @action
    showError(e: unknown) {
        this.error = e;
    }

    /** Reset this component to clear the current error and attempt to re-render its contents. */
    @action
    clear() {
        this.error = null;
    }
}
