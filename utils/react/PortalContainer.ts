/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {createContext, useContext} from 'react';

/**
 * Holds the element that Hoist popovers and other overlays portal into - set by
 * `PortalContainerProvider` in `@xh/hoist/cmp/popover`.
 * @internal
 */
export const PortalContainerContext = createContext<HTMLElement>(null);

/** The container set by the nearest `PortalContainerProvider`, or null for `document.body`. */
export function usePortalContainer(): HTMLElement {
    return useContext(PortalContainerContext);
}
