/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * SPIKE - Blueprint removal, Phase 0. Set `localStorage.xhSpikeFloatingUi = 'true'` and reload to
 * render popovers, menus and context menus with the Floating UI implementations instead of
 * Blueprint's.
 */
export const SPIKE_FLOATING_UI: boolean = (() => {
    try {
        return window.localStorage.getItem('xhSpikeFloatingUi') === 'true';
    } catch {
        return false;
    }
})();
