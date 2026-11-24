/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ElementFactory} from '@xh/hoist/core';
import {elementFactory} from '@xh/hoist/core';
import type {ComponentProps} from 'react';
import type {SetOptional} from 'type-fest';

import {DragDropProvider} from '@dnd-kit/react';

export {DragDropProvider};
export {useDroppable} from '@dnd-kit/react';
export {isSortable, useSortable} from '@dnd-kit/react/sortable';
export type {UseSortableInput} from '@dnd-kit/react/sortable';
export {
    Accessibility,
    AutoScroller,
    Cursor,
    Feedback,
    KeyboardSensor,
    PointerActivationConstraints,
    PointerSensor,
    PreventSelection
} from '@dnd-kit/dom';
export type {DragDropManager, DragEndEvent, DragOverEvent, DragStartEvent} from '@dnd-kit/dom';
export {Plugin} from '@dnd-kit/abstract';
export {RestrictToHorizontalAxis, RestrictToVerticalAxis} from '@dnd-kit/abstract/modifiers';

export type DragDropProviderProps = SetOptional<
    ComponentProps<typeof DragDropProvider>,
    'children'
>;

export const dragDropProvider: ElementFactory<DragDropProviderProps> =
    elementFactory<DragDropProviderProps>(DragDropProvider);
