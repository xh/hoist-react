/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Offset} from '@blueprintjs/core/lib/esnext/components/context-menu/contextMenuShared';
import {XH} from '@xh/hoist/core';
import {Classes, hideContextMenu, showContextMenu as bpShowContextMenu} from '@blueprintjs/core';
import {ReactElement} from 'react';

/**
 * Wraps Blueprint's showContextMenu function to ensure that the context menu is rendered
 * with createRoot, which is necessary for proper rendering in a React 18 environment.
 */
export function showContextMenu(menu: ReactElement, offset?: Offset) {
    const listener = installBackdropListener();
    bpShowContextMenu({
        content: menu,
        targetOffset: offset,
        isDarkTheme: XH.darkTheme,
        // Deferred - a right-click's mousedown closes the menu before its contextmenu event fires.
        onClose: () => setTimeout(() => removeBackdropListener(listener), 500)
    });
}

//------------------------
// Implementation
//------------------------
// Blueprint covers the page with a backdrop while its context menu is open. A right-click there
// closes the menu, but the browser's own menu then appears and the app beneath never sees the
// click. Intercept it and replay the click on whatever lies underneath, so a new context menu can
// open at the new spot. The browser menu shows only if nothing beneath claims the click.
type ContextMenuListener = (e: MouseEvent) => void;
let backdropListener: ContextMenuListener = null;

function installBackdropListener(): ContextMenuListener {
    removeBackdropListener(backdropListener);
    const listener: ContextMenuListener = e => {
        const backdrop = e.target as HTMLElement;
        if (!backdrop?.classList?.contains(Classes.CONTEXT_MENU_BACKDROP)) return;

        e.stopPropagation();
        hideContextMenu();
        removeBackdropListener(listener);

        // The backdrop may linger through its exit transition - look past it.
        backdrop.style.pointerEvents = 'none';
        const beneath = document.elementFromPoint(e.clientX, e.clientY),
            replay = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY,
                button: 2
            });
        if (beneath?.dispatchEvent(replay) === false) e.preventDefault();
    };
    document.addEventListener('contextmenu', listener, true);
    return (backdropListener = listener);
}

// Removes only if still current - a stale deferred remover must not take down a newer menu's.
function removeBackdropListener(listener: ContextMenuListener) {
    if (!listener || listener !== backdropListener) return;
    document.removeEventListener('contextmenu', listener, true);
    backdropListener = null;
}
