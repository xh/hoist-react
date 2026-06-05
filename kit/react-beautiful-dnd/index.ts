/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {DragDropContext, DragDropContextProps, Draggable, Droppable} from '@hello-pangea/dnd';
import {SetOptional} from 'type-fest';

export {DragDropContext, Droppable, Draggable};

// Sourced from @hello-pangea/dnd, a maintained, React 19-ready, drop-in fork of the now-archived
// react-beautiful-dnd. The runtime API is identical. This kit path is retained to minimize churn
// and may be revisited if we migrate off this lineage entirely (e.g. to Pragmatic DnD).
export const droppable = elementFactory(Droppable),
    draggable = elementFactory(Draggable);

// Mark `children` optional - our call sites pass content via the factory `item` alias.
export const dragDropContext =
    elementFactory<SetOptional<DragDropContextProps, 'children'>>(DragDropContext);
