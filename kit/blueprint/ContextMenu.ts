/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Offset} from '@blueprintjs/core/lib/esnext/components/context-menu/contextMenuShared';
import {XH} from '@xh/hoist/core';
import {showContextMenu as bpShowContextMenu} from '@blueprintjs/core';
import {ReactElement} from 'react';
import {createRoot} from 'react-dom/client';

/**
 * Wraps Blueprint's showContextMenu function to ensure that the context menu is rendered
 * with createRoot, which is necessary for proper rendering in a React 18 environment.
 */
export function showContextMenu(menu: ReactElement, offset?: Offset) {
    const rootKey: string = 'xhContextMenuRoot';
    bpShowContextMenu(
        {content: menu, targetOffset: offset, isDarkTheme: XH.darkTheme},
        {
            domRenderer: (element, container) => {
                container[rootKey] = createRoot(container);
                container[rootKey].render(element);
            },
            domUnmounter: container => container[rootKey].unmount()
        }
    );
}
