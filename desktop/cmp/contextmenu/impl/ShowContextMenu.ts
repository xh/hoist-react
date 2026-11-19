/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PopoverImpl} from '@xh/hoist/cmp/popover/impl/PopoverImpl';
import type {ReactElement} from 'react';
import {createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';

/** Position on the page to open a context menu at, in client pixels. */
export interface ContextMenuOffset {
    left: number;
    top: number;
}

let root: Root = null,
    menuKey = 0;

/**
 * Show a context menu at the given point - by default the top-left of the page. Replaces any
 * context menu already showing. It closes on a click or right-click outside it, on Escape, or when
 * an item is chosen.
 */
export function showContextMenu(menu: ReactElement, offset?: ContextMenuOffset) {
    if (!root) {
        const container = document.createElement('div');
        container.className = 'xh-context-menu-root';
        document.body.appendChild(container);
        root = createRoot(container);
    }

    const close = () => root.render(null);

    root.render(
        createElement(PopoverImpl, {
            // A new key for each menu, so it opens with fresh state.
            key: ++menuKey,
            isOpen: true,
            onInteraction: open => !open && close(),
            anchorPoint: {left: offset?.left ?? 0, top: offset?.top ?? 0},
            position: 'right-top',
            minimal: true,
            hasBackdrop: true,
            backdropProps: {
                className: 'xh-context-menu__backdrop bp6-context-menu-backdrop',
                // A right-click outside the menu closes it, without the browser's own menu.
                onContextMenu: e => {
                    e.preventDefault();
                    close();
                }
            },
            popoverClassName: 'xh-context-menu bp6-context-menu-popover',
            content: menu
        })
    );
}
