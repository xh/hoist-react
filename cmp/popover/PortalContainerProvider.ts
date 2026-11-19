/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {PortalContainerContext} from '@xh/hoist/utils/react';
import {createElement} from 'react';

export interface PortalContainerProviderProps extends HoistProps {
    /** Element that popovers and other overlays within this provider render into. */
    container: HTMLElement;
}

/**
 * Render `children` so that Hoist popovers and other overlays within them portal into `container`
 * rather than `document.body` - e.g. to keep them in a popped-out child window.
 */
export const [PortalContainerProvider, portalContainerProvider] =
    hoistCmp.withFactory<PortalContainerProviderProps>({
        displayName: 'PortalContainerProvider',
        model: false,
        observer: false,

        render({container, children}) {
            return createElement(PortalContainerContext.Provider, {value: container}, children);
        }
    });
