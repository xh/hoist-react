/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';

import {box} from './Box';

/**
 * A Box class that flexes to grow and stretch within its *own* parent via flex:'auto', useful for
 * creating nested layouts.
 *
 * VFrame and HFrame variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const [Frame, frame] = hoistComponent(function Frame(props) {
    return box({...props, flex: 'auto'});
});

export const [VFrame, vframe] = hoistComponent(function VFrame(props) {
    return box({
        ...props,
        flex: 'auto',
        flexDirection: 'column',
        className: getClassName('xh-vframe', props)
    });
});

export const [HFrame, hframe] = hoistComponent(function HFrame(props) {
    return box({
        ...props,
        flex: 'auto',
        flexDirection: 'row',
        className: getClassName('xh-hframe', props)
    });
});