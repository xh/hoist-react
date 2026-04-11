/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BoxProps, hoistCmp, HoistProps} from '@xh/hoist/core';
import {TEST_ID, mergeDeep} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {div} from './Tags';

/**
 * Props for {@link Box}, {@link VBox}, and {@link HBox} layout containers.
 * Combines {@link HoistProps} with {@link BoxProps} (layout attributes resolved to CSS styles).
 */
export interface BoxComponentProps extends HoistProps, BoxProps {}

/**
 * Base flexbox container that merges all {@link LayoutProps} — margin, padding, dimensions,
 * flex, alignment, and overflow — onto a rendered `div`. This is the terminal component where
 * layout props are resolved to CSS; higher-level components pass layout props through to a
 * Box (or {@link Frame}) at the bottom of their render tree.
 *
 * **Application code should generally prefer {@link VBox} or {@link HBox}**, which make layout
 * direction explicit. Bare `box()` applies `display: flex` with the CSS default direction (row)
 * but does not communicate that intent clearly.
 */
export const [Box, box] = hoistCmp.withFactory<BoxComponentProps>({
    displayName: 'Box',
    model: false,
    memo: false,
    observer: false,

    render(props, ref) {
        // Note `model` destructured off of non-layout props to avoid setting
        // model as a bogus DOM attribute. This low-level component may easily be passed one from
        // a parent that has not properly managed its own props.
        let [layoutProps, {children, model, testId, ...restProps}] = splitLayoutProps(props);

        restProps = mergeDeep(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
            {style: layoutProps},
            {[TEST_ID]: testId},
            restProps
        );

        return div({
            ref,
            ...restProps,
            items: children
        });
    }
});

/**
 * A {@link Box} with vertical (column) flex layout. Does not stretch to fill its parent —
 * use {@link VFrame} instead when the container should grow to consume available space.
 */
export const [VBox, vbox] = hoistCmp.withFactory<BoxComponentProps>({
    displayName: 'VBox',
    model: false,
    memo: false,
    observer: false,
    className: 'xh-vbox',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flexDirection: 'column'
        });
    }
});

/**
 * A {@link Box} with horizontal (row) flex layout. Does not stretch to fill its parent —
 * use {@link HFrame} instead when the container should grow to consume available space.
 */
export const [HBox, hbox] = hoistCmp.withFactory<BoxComponentProps>({
    displayName: 'HBox',
    model: false,
    memo: false,
    observer: false,
    className: 'xh-hbox',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flexDirection: 'row'
        });
    }
});
