/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, HoistProps} from '@xh/hoist/core';
import {box} from './Box';
import './Viewport.scss';

export interface ViewportProps extends HoistProps, BoxProps {}

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser.
 */
export const [Viewport, viewport] = hoistCmp.withFactory<ViewportProps>({
    displayName: 'Viewport',
    model: false,
    memo: false,
    observer: false,

    className: 'xh-viewport',

    render(props) {
        return box({
            position: 'fixed', // must be specified here to override Box's inline style spec of position: 'relative'
            ...props
        });
    }
});
