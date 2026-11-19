/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Classes set on the document root while the user works with the mouse, under which focus
 * outlines are hidden. Pressing Tab clears them, so keyboard users see where focus is. Blueprint's
 * class is kept so its styles, and any app CSS keyed to it, still apply.
 */
const FOCUS_DISABLED_CLASSES = ['xh-focus-disabled', 'bp6-focus-disabled'];

let installed = false;

/**
 * Show focus outlines only after the user starts tabbing, as Blueprint's
 * `FocusStyleManager.onlyShowFocusOnTabs()` did. Call once - later calls do nothing.
 * @internal
 */
export function installFocusStyle() {
    if (installed || typeof document === 'undefined') return;
    installed = true;

    const root = document.documentElement;
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        root.classList.remove(...FOCUS_DISABLED_CLASSES);
        root.removeEventListener('keydown', onKeyDown);
        root.addEventListener('mousedown', onMouseDown);
    };
    const onMouseDown = () => {
        root.classList.add(...FOCUS_DISABLED_CLASSES);
        root.removeEventListener('mousedown', onMouseDown);
        root.addEventListener('keydown', onKeyDown);
    };
    root.addEventListener('mousedown', onMouseDown);
}
