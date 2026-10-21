/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Offset} from '@blueprintjs/core/lib/esnext/components/context-menu/contextMenuShared';
import {XH} from '@xh/hoist/core';
import {Classes, showContextMenu as bpShowContextMenu} from '@blueprintjs/core';
import {ReactElement} from 'react';

/**
 * Wraps Blueprint's showContextMenu function to ensure that the context menu is rendered
 * with createRoot, which is necessary for proper rendering in a React 18 environment.
 */
export function showContextMenu(menu: ReactElement, offset?: Offset) {
    installBackdropListener();
    bpShowContextMenu({content: menu, targetOffset: offset, isDarkTheme: XH.darkTheme});
}

//------------------------
// Implementation
//------------------------
// Blueprint covers the page with a backdrop while its context menu is open. A right-click there
// closes the menu, but nothing stops the browser's own menu from appearing. Installed once.
let backdropListenerInstalled = false;

function installBackdropListener() {
    if (backdropListenerInstalled) return;
    backdropListenerInstalled = true;
    document.addEventListener(
        'contextmenu',
        e => {
            const target = e.target as HTMLElement;
            if (target?.classList?.contains(Classes.CONTEXT_MENU_BACKDROP)) e.preventDefault();
        },
        true
    );
}
