/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {Component} from 'react';

/**
 * A minimal component implementing a React error boundary.
 *
 * Any errors occurring during rendering will yield a simple error
 * string, and a call to the onError callback.
 *
 * @private
 */
export class ErrorBoundary extends Component {

    constructor(props) {
        super(props);
        this.state = {caughtError: null, onError: props.onError};
    }

    render() {
        return this.state.caughtError ?
            'An error occurred while rendering this Component.' :
            (this.props.children || null);
    }

    componentDidCatch(e, info) {
        const {onError} = this.state;
        if (onError) onError(e);
    }

    static getDerivedStateFromError(e) {
        return {caughtError: e};
    }
}
export const errorBoundary = elemFactory(ErrorBoundary);