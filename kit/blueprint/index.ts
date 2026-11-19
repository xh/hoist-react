/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    BlueprintProvider,
    Classes,
    type HotkeyConfig,
    OverlayToaster,
    PopoverInteractionKind,
    Position,
    type ToasterPosition,
    useHotkeys
} from '@blueprintjs/core';
import {elementFactory} from '@xh/hoist/core';

//---------------------
// Re-exports
//---------------------
export type {HotkeyConfig, ToasterPosition};
export {useHotkeys, Classes, PopoverInteractionKind, Position, OverlayToaster};
export * from './Wrappers';
export * from './Dialog';
export * from './ContextMenu';

export const blueprintProvider = elementFactory(BlueprintProvider);
