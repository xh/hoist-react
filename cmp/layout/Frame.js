/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';

import {box} from './Box';

/**
 * A Box class that flexes to grow and stretch within its *own* parent via flex:'auto', useful for
 * creating nested layouts.
 *
 * Like Box, Frame provides access to its internal div via a ref argument.
 *
 * VFrame and HFrame variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const [Frame, frame] = hoistCmp.withFactory({
    displayName: 'Frame',
    model: false, memo: false, observer: false,

    render(props, ref) {
        return box({ref, ...props, flex: 'auto'});
    }
});

export const [VFrame, vframe] = hoistCmp.withFactory({
    displayName: 'VFrame',
    model: false, memo: false, observer: false,
    className: 'xh-vframe',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flex: 'auto',
            flexDirection: 'column'
        });
    }
});

export const [HFrame, hframe] = hoistCmp.withFactory({
    displayName: 'HFrame',
    model: false, memo: false, observer: false,
    className: 'xh-hframe',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flex: 'auto',
            flexDirection: 'row'
        });
    }
});