/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * SPIKE - Blueprint removal, Phase 0. Stands in for Blueprint's imperative `showContextMenu`,
 * rendering the menu in the spike `FloatingPopover`, anchored at the given page offset.
 */
import {createElement as h, type ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {FloatingPopover} from '../../popover/impl/FloatingPopover';

let root: Root = null,
    seq = 0;

export function showFloatingContextMenu(menu: ReactElement, offset: {left: number; top: number}) {
    if (!root) {
        const container = document.createElement('div');
        container.className = 'xh-floating-context-menu-root';
        document.body.appendChild(container);
        root = createRoot(container);
    }

    const close = () => root.render(null);

    root.render(
        h(FloatingPopover, {
            key: ++seq, // A new menu replaces any open one, with fresh state.
            isOpen: true,
            onInteraction: open => !open && close(),
            placement: 'right-start',
            arrow: false,
            hasBackdrop: true,
            backdropProps: {
                className: 'bp6-context-menu-backdrop',
                // A right-click outside the menu closes it, without the browser's own menu.
                onContextMenu: e => {
                    e.preventDefault();
                    close();
                }
            },
            popoverClassName: 'bp6-context-menu-popover',
            shouldReturnFocusOnClose: false,
            content: menu,
            // Anchor to a zero-size element fixed at the offset. It must be the reference itself,
            // not wrapped, so the menu positions against it.
            renderTarget: ({ref}) =>
                h('span', {
                    ref,
                    style: {
                        position: 'fixed',
                        left: offset?.left ?? 0,
                        top: offset?.top ?? 0,
                        width: 0,
                        height: 0
                    }
                })
        })
    );
}
