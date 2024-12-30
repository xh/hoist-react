/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, HoistProps} from '@xh/hoist/core';
import {box} from './Box';

export interface FrameProps extends HoistProps, BoxProps {}

/**
 * A Box class that flexes to grow and stretch within its *own* parent via flex:'auto', useful for
 * creating nested layouts.
 *
 * Like Box, Frame provides access to its internal div via a ref argument.
 *
 * VFrame and HFrame variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const [Frame, frame] = hoistCmp.withFactory<FrameProps>({
    displayName: 'Frame',
    model: false,
    memo: false,
    observer: false,

    render(props, ref) {
        return box({ref, ...props, flex: 'auto'});
    }
});

export const [VFrame, vframe] = hoistCmp.withFactory<FrameProps>({
    displayName: 'VFrame',
    model: false,
    memo: false,
    observer: false,
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

export const [HFrame, hframe] = hoistCmp.withFactory<FrameProps>({
    displayName: 'HFrame',
    model: false,
    memo: false,
    observer: false,
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
