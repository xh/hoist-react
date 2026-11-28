/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverProps} from '@xh/hoist/cmp/popover';
import {popoverImpl} from '@xh/hoist/cmp/popover/impl/PopoverImpl';
import {hoistCmp, type Intent} from '@xh/hoist/core';
import classNames from 'classnames';

/** Props for a `Tooltip` - the subset of `PopoverProps` that applies, plus intent and size. */
export interface TooltipProps extends Pick<
    PopoverProps,
    | 'boundary'
    | 'children'
    | 'className'
    | 'content'
    | 'defaultIsOpen'
    | 'disabled'
    | 'hoverCloseDelay'
    | 'hoverOpenDelay'
    | 'isOpen'
    | 'minimal'
    | 'onInteraction'
    | 'openOnTargetFocus'
    | 'popoverClassName'
    | 'portalContainer'
    | 'position'
    | 'renderTarget'
    | 'targetTagName'
    | 'testId'
    | 'usePortal'
> {
    /** Intent to color the tooltip with. */
    intent?: Intent;

    /** True to draw the tooltip with less padding. */
    compact?: boolean;
}

/** Gap between a tooltip and its target, which leaves room for its smaller arrow. */
const TOOLTIP_OFFSET = 11;

/**
 * A short label that appears while the pointer rests on its target, or while the target has
 * keyboard focus. Pass the target as the single child and the label as `content`.
 *
 * For a plain-text label on a button, its `tooltip` prop - a native `title` - is often enough.
 * Use this component for styled or richer content, or to show the label sooner.
 */
export const [Tooltip, tooltip] = hoistCmp.withFactory<TooltipProps>({
    displayName: 'Tooltip',
    className: 'xh-tooltip-target',
    model: false,

    render(props) {
        const {intent, compact, popoverClassName, ...rest} = props;
        return popoverImpl({
            hoverOpenDelay: 100,
            hoverCloseDelay: 0,
            ...rest,
            interactionKind: 'hover-target',
            autoFocus: false,
            offset: {mainAxis: TOOLTIP_OFFSET},
            popupRole: 'tooltip',
            popoverClassName: classNames(
                'xh-tooltip',
                'bp6-tooltip',
                intent && [`xh-tooltip--intent-${intent}`, `bp6-intent-${intent}`],
                compact && ['xh-tooltip--compact', 'bp6-compact'],
                popoverClassName
            )
        });
    }
});
