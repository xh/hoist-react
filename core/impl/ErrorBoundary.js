/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from '@xh/hoist/core';

/**
 *
 * @private
 *
 * A minimal component implementing a React error boundary.
 *
 * Any errors occuring during rendering will yield a simple error
 * string, and a call to the onError callback.
 */
export class ErrorBoundary extends Component {

    constructor(props) {
        super(props);
        this.state = {caughtError: null, onError: props.onError};
    }

    render() {
        return this.state.caughtError ?
            'An error occurred while rendering this Component.' :
            this.props.children;
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