/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ExceptionHandlerOptions, HoistModel, XH} from '@xh/hoist/core';
import React, {ReactNode} from 'react';
import {action, makeObservable, observable} from 'mobx';
import {isFunction} from 'lodash';

export interface ErrorBoundaryConfig {
    /**
     * Function to handle exception.  May also be specified as a
     * config for XH.handleException.
     *
     * Defaults to {showAlert: false}
     */
    errorHandler?: ExceptionHandlerOptions | ((e: unknown) => void);

    /**
     * Function to render error.
     *
     * If not specified, error will be displayed using a platform appropriate
     * ErrorMessage component.
     */
    errorRenderer?: (e: unknown) => ReactNode;
}

/**
 * Model for ErrorBoundary.
 */
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
     * Handle the exception and replace the contents of the component
     * with an exception display.
     *
     * This method does not need to be called for React Lifecycle events
     * that occur within its rendered content. It is publicly available
     * for applications that wish to use this component to show other caught
     * exceptions (e.g. from http requests).
     *
     * For exceptions that have already been handled see showException()
     * instead.
     */
    @action
    handleError(e: unknown) {
        let handler = this.errorHandler;
        if (handler) {
            isFunction(handler) ?
                handler(e) :
                XH.handleException(e, handler as any);
        }
        this.error = e;
    }

    /**
     * Replace the contents of the panel with an exception display.
     *
     * Note that unlike handleException() this method will *not* report
     * or otherwise handle the exception.
     */
    @action
    showError(e: unknown) {
        this.error = e;
    }

    /**
     * Reset this component to hide any exception and reshow its
     * specified content.
     */
    @action
    reset() {
        this.error = null;
    }
}
