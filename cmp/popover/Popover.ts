/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {createElement} from 'react';
import {PopoverImpl, type PopoverImplProps} from './impl/PopoverImpl';
import type {PopoverProps} from './Types';
import './Popover.scss';

/**
 * Defaults on mobile: a transparent backdrop catches a tap outside the popover, so it closes the
 * popover without reaching what lies behind. Fixed positioning keeps the popover in place as the
 * page scrolls under the on-screen keyboard. Focus stays put on open - touch users do not need
 * it moved, and the browser would draw a focus ring around the popover.
 */
const MOBILE_DEFAULTS: Partial<PopoverImplProps> = {
    autoFocus: false,
    hasBackdrop: true,
    minimal: true,
    strategy: 'fixed',
    targetTagName: 'div'
};

/**
 * Content that floats beside a target element, opened by clicking or hovering on the target.
 *
 * Pass the target as the single child and the floating content as `content`. Open state is
 * internal unless `isOpen` is passed, in which case the popover is controlled and reports
 * requested changes via `onInteraction`.
 *
 * A click on any element with the class `xh-popover-dismiss` within the content closes the
 * popover - menu items use this to close the menu that holds them. Any popover closes when the
 * app's route changes.
 *
 * Works on desktop and mobile. On mobile it has no arrow, and a tap outside it closes it without
 * reaching the element beneath.
 */
export const [Popover, popover] = hoistCmp.withFactory<PopoverProps>({
    displayName: 'Popover',
    className: 'xh-popover',
    model: false,

    render(props) {
        if (!XH.appSpec?.isMobileApp) return createElement(PopoverImpl, props);

        // Mobile keeps an outer element carrying the class names around the target wrapper, as
        // mobile's own popover rendered before this shared one replaced it.
        const {className, ...rest} = props;
        return createElement(
            'div',
            {className},
            createElement(PopoverImpl, {...MOBILE_DEFAULTS, ...rest})
        );
    }
});
