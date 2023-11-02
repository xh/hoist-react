/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {hoistCmp} from '@xh/hoist/core';
import {ReactPortal} from 'react';
import ReactDom from 'react-dom';
import './FullscreenPanel.scss';
import {panel, PanelProps} from './Panel';

export interface FullscreenPanelProps extends PanelProps {
    /** Is the fullscreen panel shown.  */
    isOpen?: boolean;

    /** Optional z-index override. Useful for stacking multiple fullscreen panels. */
    zIndex?: number;
}

/**
 * Display a Panel as a fullscreen view.
 *
 * These views do not participate in navigation or routing, and are used for showing fullscreen
 * views outside of the Navigator / TabContainer context.
 *
 * @see DialogPanel for a floating alternative.
 */
export const [FullscreenPanel, fullscreenPanel] = hoistCmp.withFactory<FullscreenPanelProps>({
    displayName: 'FullscreenPanel',
    className: 'xh-fullscreen-panel',
    memo: false,
    model: false,
    observer: false,

    render({className, isOpen, zIndex, children, ...rest}) {
        if (!isOpen) return null;
        return ReactDom.createPortal(
            panel({
                className,
                items: children,
                style: {zIndex},
                ...rest
            }),
            getOrCreateFullscreenPortalDiv()
        ) as ReactPortal;
    }
});

function getOrCreateFullscreenPortalDiv() {
    const FULLSCREEN_PORTAL_ID = 'xh-fullscreen-panel-portal';
    let portal = document.getElementById(FULLSCREEN_PORTAL_ID);
    if (!portal) {
        portal = document.createElement('div');
        portal.id = FULLSCREEN_PORTAL_ID;
        document.body.appendChild(portal);
    }
    return portal;
}
