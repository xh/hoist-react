/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    BlueprintProvider,
    Classes,
    FocusStyleManager,
    type HotkeyConfig,
    OverlayToaster,
    PopoverInteractionKind,
    Position,
    type ToasterPosition,
    useHotkeys
} from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import {elementFactory} from '@xh/hoist/core';
import './styles.scss';

// Only show focus indicators when tabbing through components - avoids drawing focus outlines
// on focusable components when focused via mouse click.
FocusStyleManager.onlyShowFocusOnTabs();

//---------------------
// Re-exports
//---------------------
export {
    useHotkeys,
    HotkeyConfig,
    Classes,
    PopoverInteractionKind,
    Position,
    OverlayToaster,
    ToasterPosition
};
export * from './Wrappers';
export * from './Dialog';
export * from './ContextMenu';

export const blueprintProvider = elementFactory(BlueprintProvider);
