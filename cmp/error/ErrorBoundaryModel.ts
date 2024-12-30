/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ExceptionHandlerOptions, HoistModel, XH} from '@xh/hoist/core';
import {isFunction} from 'lodash';
import {action, makeObservable, observable} from 'mobx';
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

export class ErrorBoundaryModel extends HoistModel {
    errorHandler: ExceptionHandlerOptions | ((e: unknown) => void);
    errorRenderer: (e: unknown) => ReactNode;

    /**
     * Caught error being displayed instead of the content.
     * Null if content rendering normally.
     */
    @observable.ref error: unknown;

    constructor(config?: ErrorBoundaryConfig) {
        super();
        makeObservable(this);
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
