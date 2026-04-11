/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, HoistProps} from '@xh/hoist/core';
import {box} from './Box';

/**
 * Props for {@link Frame}, {@link VFrame}, and {@link HFrame} layout containers.
 * Combines {@link HoistProps} with {@link BoxProps} (layout attributes resolved to CSS styles).
 */
export interface FrameProps extends HoistProps, BoxProps {}

/**
 * A {@link Box} that stretches to fill its parent via `flex: auto`. Like Box, it supports
 * all {@link LayoutProps} and merges them onto its rendered `div`.
 *
 * **Application code should generally prefer {@link VFrame} or {@link HFrame}**, which make
 * layout direction explicit. Bare `frame()` inherits the CSS default direction (row) but does
 * not communicate that intent clearly.
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

/**
 * A {@link Frame} with vertical (column) flex layout. Stretches to fill its parent via
 * `flex: auto` — use {@link VBox} instead when the container should size to its content.
 */
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

/**
 * A {@link Frame} with horizontal (row) flex layout. Stretches to fill its parent via
 * `flex: auto` — use {@link HBox} instead when the container should size to its content.
 */
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
