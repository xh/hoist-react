/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {
    Classes,
    ContextMenu,
    Dialog,
    FocusStyleManager,
    HotkeysProvider,
    type HotkeyConfig,
    Overlay,
    Popover,
    PopoverInteractionKind,
    Position,
    Toaster,
    type ToasterPosition,
    useHotkeys
} from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import './styles.scss';

// Only show focus indicators when tabbing through components - avoids drawing focus outlines
// on focusable components when focused via mouse click.
FocusStyleManager.onlyShowFocusOnTabs();

// Disable fade/scale-in transitions.
// See also popover-related override in ./styles.scss.
Dialog.defaultProps.transitionDuration = 0;
Dialog.defaultProps.transitionName = 'none';
Overlay.defaultProps.transitionDuration = 0;
Overlay.defaultProps.transitionName = 'none';
Popover.defaultProps.transitionDuration = 0;

//---------------------
// Re-exports
//---------------------
export {
    useHotkeys,
    HotkeyConfig,
    ContextMenu,
    Classes,
    PopoverInteractionKind,
    Position,
    Toaster,
    ToasterPosition
};
export * from './Wrappers';
export * from './Dialog';

export const hotkeysProvider = elementFactory(HotkeysProvider);
