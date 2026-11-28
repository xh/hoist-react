/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Placement} from '@floating-ui/react';
import type {ReactElement, RefObject} from 'react';
import {createElement as h} from 'react';

/** Size of the arrow's SVG box. The popover sits half this far from its target. */
export const POPOVER_ARROW_SIZE = 30;

/** Gap between the arrow's tip and the target. */
const ARROW_SPACING = 4;

// The arrow shape and its border, drawn pointing left and rotated to face the target.
const BORDER_PATH =
        'M8.11 6.302c1.015-.936 1.887-2.922 1.887-4.297v26c0-1.378-.868-3.357-1.888-4.297L.925 17.09c-1.237-1.14-1.233-3.034 0-4.17L8.11 6.302z',
    FILL_PATH =
        'M8.787 7.036c1.22-1.125 2.21-3.376 2.21-5.03V0v30-2.005c0-1.654-.983-3.9-2.21-5.03l-7.183-6.616c-.81-.746-.802-1.96 0-2.7l7.183-6.614z';

export function popoverArrow(
    ref: RefObject<HTMLDivElement>,
    placement: Placement,
    coords: {x?: number; y?: number}
): ReactElement {
    const side = placement.split('-')[0],
        angle = {top: -90, left: 180, bottom: 90}[side] ?? 0,
        inset = -(POPOVER_ARROW_SIZE / 2 - ARROW_SPACING),
        sideStyle =
            {top: {bottom: inset}, left: {right: inset}, bottom: {top: inset}}[side] ??
            ({left: inset} as const);

    return h(
        'div',
        {
            ref,
            'aria-hidden': true,
            className: 'xh-popover__arrow',
            style: {
                position: 'absolute',
                width: POPOVER_ARROW_SIZE,
                height: POPOVER_ARROW_SIZE,
                left: coords?.x,
                top: coords?.y,
                ...sideStyle
            }
        },
        h(
            'svg',
            {
                width: POPOVER_ARROW_SIZE,
                height: POPOVER_ARROW_SIZE,
                viewBox: `0 0 ${POPOVER_ARROW_SIZE} ${POPOVER_ARROW_SIZE}`,
                style: {display: 'block', transform: `rotate(${angle}deg)`}
            },
            h('path', {
                className: 'xh-popover__arrow-border',
                d: BORDER_PATH
            }),
            h('path', {className: 'xh-popover__arrow-fill', d: FILL_PATH})
        )
    );
}
