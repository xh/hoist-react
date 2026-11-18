/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ReactNode} from 'react';
import {createContext, createElement, useContext} from 'react';

const PortalContainerContext = createContext<HTMLElement>(null);

/**
 * Render `children` so that Hoist popovers and other overlays within them portal into `container`
 * rather than `document.body` - e.g. to keep them in a popped-out child window.
 */
export function portalContainerProvider({
    container,
    children
}: {
    container: HTMLElement;
    children?: ReactNode;
}): ReactNode {
    return createElement(PortalContainerContext.Provider, {value: container}, children);
}

/** The container set by the nearest `portalContainerProvider`, or null for `document.body`. */
export function usePortalContainer(): HTMLElement {
    return useContext(PortalContainerContext);
}
