/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {elemFactory, XH} from '@xh/hoist/core';
import {Component} from 'react';

/**
 * A minimal component implementing a React error boundary.
 * Any errors during rendering will yield a simple error string and a call to the onError callback.
 *
 * @internal
 */
export class ErrorBoundary extends Component {

    constructor(props) {
        super(props);
        this.state = {caughtError: null, onError: props.onError};
    }

    render() {
        // @ts-ignore
        return this.state.caughtError ? 'An error occurred while rendering this Component.' : this.props.children ?? null;
    }

    componentDidCatch(e, info) {
        XH.handleException(e, {requireReload: true});
    }

    static getDerivedStateFromError(e) {
        return {caughtError: e};
    }
}
export const errorBoundary = elemFactory(ErrorBoundary);
