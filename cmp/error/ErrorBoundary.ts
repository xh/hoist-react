/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {elementFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/cmp/error';
import {Component, ReactNode} from 'react';
import {ErrorBoundaryModel} from './ErrorBoundaryModel';

/**
 * A wrapper component that will catch an otherwise unhandled React lifecycle error from any child
 * component, preventing such an error from bringing down the entire app. Upon catching an error,
 * this comp will swap out its children with an `ErrorMessage` component (or other configured
 * renderer), giving the user the chance to report the exception and optionally try again.
 *
 * This wrapper will automatically only catch and handle exceptions that occur during the React
 * lifecycle, but applications that wish to use this component to display other caught exceptions
 * may explicitly use it to handle those exceptions.
 */
export const [ErrorBoundary, errorBoundary] = hoistCmp.withFactory<ErrorBoundaryModel>({
    displayName: 'ErrorBoundary',
    model: uses(ErrorBoundaryModel, {
        createDefault: true,
        fromContext: false,
        publishMode: 'limited'
    }),

    render({model, children}) {
        let {error, errorRenderer} = model;

        if (!error) return reactErrorBoundary({model, children});
        if (errorRenderer) return errorRenderer(error);

        return errorMessage({
            error,
            title: 'Unexpected error while rendering this component',
            actionFn: () => model.clear(),
            detailsFn: () => XH.exceptionHandler.showExceptionDetails(error)
        });
    }
});

//------------------------------------------------------------------
// Standard recipe from React Docs, requires class based component
// See https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
//------------------------------------------------------------------
class ReactErrorBoundary extends Component<
    {children: ReactNode; model: ErrorBoundaryModel},
    {error: unknown}
> {
    override state = {error: null};
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
const reactErrorBoundary = elementFactory(ReactErrorBoundary);
