/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ComponentType} from 'react';
import type {PopoverProps, TooltipProps} from '../Types';

/**
 * Blueprint's popover and tooltip, registered by `kit/blueprint` on desktop, for the
 * `useBlueprint` defaults of `Popover` and `Tooltip`. Registered rather than imported, so this
 * shared package never pulls Blueprint into mobile apps.
 */
let legacyPopover: ComponentType<PopoverProps> = null,
    legacyTooltip: ComponentType<TooltipProps> = null;

export function registerLegacyPopover(cmp: ComponentType<PopoverProps>) {
    legacyPopover = cmp;
}

export function getLegacyPopover(): ComponentType<PopoverProps> {
    return legacyPopover;
}

export function registerLegacyTooltip(cmp: ComponentType<TooltipProps>) {
    legacyTooltip = cmp;
}

export function getLegacyTooltip(): ComponentType<TooltipProps> {
    return legacyTooltip;
}
