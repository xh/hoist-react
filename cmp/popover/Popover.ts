/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {createElement} from 'react';
import {getLegacyPopover} from './impl/LegacyPopover';
import {PopoverImpl} from './impl/PopoverImpl';
import type {PopoverDefaults, PopoverProps} from './Types';

/**
 * Content that floats beside a target element, opened by clicking or hovering on the target.
 *
 * Pass the target as the single child and the floating content as `content`. Open state is
 * internal unless `isOpen` is passed, in which case the popover is controlled and reports
 * requested changes via `onInteraction`.
 *
 * A click on any element with the class `xh-popover-dismiss` within the content closes the
 * popover - menu items use this to close the menu that holds them.
 */
export const [Popover, popover] = hoistCmp.withFactory<PopoverProps, PopoverDefaults>({
    displayName: 'Popover',
    className: 'xh-popover',
    model: false,
    defaults: {
        useBlueprint: false
    },

    render(props) {
        const legacy = Popover.defaults.useBlueprint ? getLegacyPopover() : null;
        return legacy ? createElement(legacy, props) : createElement(PopoverImpl, props);
    }
});
