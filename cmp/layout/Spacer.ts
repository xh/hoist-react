/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, HoistPropsWithRef, HoistProps} from '@xh/hoist/core';
import {box} from './Box';

export interface SpacerProps extends HoistPropsWithRef<HTMLDivElement>, BoxProps {}

/**
 * A component for inserting a fixed-sized spacer along the main axis of its parent container.
 * Convenience ElemFactories hspacer() and vspacer() each take a pixel size directly.
 */
export const [Spacer, spacer] = hoistCmp.withFactory<SpacerProps>({
    displayName: 'Spacer',
    model: false,
    observer: false,

    className: 'xh-spacer',

    render(props) {
        return box({
            ...props,
            flex: 'none'
        });
    }
});

/**
 * A component that stretches to soak up space along the main axis of its parent container.
 */
export const [Filler, filler] = hoistCmp.withFactory<BoxProps & HoistProps>({
    displayName: 'Filler',
    model: false,
    observer: false,
    className: 'xh-filler',

    render(props) {
        return box({
            ...props,
            flex: 'auto'
        });
    }
});

//--------------------------------
// Convenience Factories
//--------------------------------
export function hspacer(width: number = 10) {
    return spacer({width});
}
export function vspacer(height: number = 10) {
    return spacer({height});
}
