/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ComponentType} from 'react';
import type {PopoverProps} from '../Types';

/**
 * Blueprint's popover, registered by `kit/blueprint` on desktop, for `Popover.defaults.useBlueprint`.
 * Registered rather than imported, so this shared package never pulls Blueprint into mobile apps.
 */
let legacyPopover: ComponentType<PopoverProps> = null;

export function registerLegacyPopover(cmp: ComponentType<PopoverProps>) {
    legacyPopover = cmp;
}

export function getLegacyPopover(): ComponentType<PopoverProps> {
    return legacyPopover;
}
