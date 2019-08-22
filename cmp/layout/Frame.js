/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory, hoistComponent} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';

import {box} from './Box';

/**
 * A Box class that flexes to grow and stretch within its *own* parent via flex:'auto', useful for
 * creating nested layouts.
 *
 * VFrame and HFrame variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const Frame = hoistComponent({
    displayName: 'Frame',
    render(props, ref) {
        return box({ref, ...props, flex: 'auto'});
    }
});

export const VFrame = hoistComponent({
    displayName: 'VFrame',
    render(props, ref) {
        return box({
            ref,
            ...props,
            flex: 'auto',
            flexDirection: 'column',
            className: getClassName('xh-vframe', props)
        });
    }
});

export const HFrame = hoistComponent({
    displayName: 'HFrame',
    render(props, ref) {
        return box({
            ref,
            ...props,
            flex: 'auto',
            flexDirection: 'row',
            className: getClassName('xh-hframe', props)
        });
    }
});

export const frame = elemFactory(Frame);
export const vframe = elemFactory(VFrame);
export const hframe = elemFactory(HFrame);