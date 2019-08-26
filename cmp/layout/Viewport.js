/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';

import {box} from './Box';

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser.
 */
export const Viewport = hoistComponent({
    displayName: 'Viewport',

    render(props) {
        return box({
            ...props,
            top: 0,
            left: 0,
            position: 'fixed',
            width: '100%',
            height: '100%',
            className: getClassName('xh-viewport', props)
        });
    }
});
export const viewport = elemFactory(Viewport);
