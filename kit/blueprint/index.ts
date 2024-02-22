/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    Classes,
    showContextMenu,
    Dialog,
    FocusStyleManager,
    type HotkeyConfig,
    HotkeysProvider,
    Overlay,
    OverlayToaster,
    Popover,
    PopoverInteractionKind,
    Position,
    type ToasterPosition,
    useHotkeys
} from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/datetime2/lib/css/blueprint-datetime2.css';
import {elementFactory} from '@xh/hoist/core';
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
    showContextMenu,
    Classes,
    PopoverInteractionKind,
    Position,
    OverlayToaster,
    ToasterPosition
};
export * from './Wrappers';
export * from './Dialog';

export const hotkeysProvider = elementFactory(HotkeysProvider);
