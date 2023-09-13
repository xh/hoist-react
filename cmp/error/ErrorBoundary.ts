/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {elementFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
import React, {Component, ReactNode} from 'react';
import {errorMessage as mobileErrorMessage} from '@xh/hoist/dynamics/mobile';
import {errorMessage as desktopErrorMessage} from '@xh/hoist/dynamics/desktop';
import {ErrorBoundaryModel} from './ErrorBoundaryModel'

/**
 * ErrorBoundary catches React lifecycle errors from children components, protecting
 * them bringing down the entire application.  It will swap out the error inducing
 * content with an ErrorMessage component, giving the user the chance to report the
 * exception and optionally try again.
 *
 * By default, ErrorBoundary will only handle exceptions that occur during the React
 * lifecycle, but applications that wish to use this component to display all exceptions
 * may explicitly use it to handle other exceptions, including http exceptions.
 */
export const [ErrorBoundary, errorBoundary] = hoistCmp.withFactory<ErrorBoundaryModel>({
    displayName: 'ErrorBoundary',
    model: uses(ErrorBoundaryModel, {createDefault: true, fromContext: false}),
    render({model, ...props}) {
        let {error, errorRenderer} = model;

        if (!error) return reactErrorBoundary({model, ...props});
        if (errorRenderer) return errorRenderer(error);

        const cmp = XH.isDesktop ? desktopErrorMessage : mobileErrorMessage;
        return cmp({
            error,
            title: 'An error occurred rendering this component. ',
            actionFn: () => model.reset()
        });
    }
});

//------------------------------------------------------------------
// Standard recipe from React Docs, requires class based component
//------------------------------------------------------------------
class ReactErrorBoundary extends Component<{children: ReactNode, model: ErrorBoundaryModel}, {error: unknown}> {
    override state =  {error: null};
    override render() {
        return !this.state.error ? this.props.children : null;
    }

    static getDerivedStateFromError(error: unknown) {
        return {error};
    }

    override componentDidCatch(e: unknown) {
        this.props.model.handleError(e);
    }
}
const reactErrorBoundary = elementFactory(ReactErrorBoundary)
