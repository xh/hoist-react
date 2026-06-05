/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {
    DragDropContext,
    DragDropContextProps,
    Draggable,
    DraggableProps,
    Droppable,
    DroppableProps
} from '@hello-pangea/dnd';

export {DragDropContext, Droppable, Draggable};

// Sourced from @hello-pangea/dnd, a maintained, React 19-ready, drop-in fork of the now-archived
// react-beautiful-dnd. The runtime API is identical. This kit path is retained to minimize churn
// and may be revisited if we migrate off this lineage entirely (e.g. to Pragmatic DnD).
//
// @hello-pangea/dnd types `children` as required, but Hoist element factories supply children via
// `item`/`items` (or a `children` render-prop), so we relax it to optional for the factory specs.
type OptionalChildren<P extends {children?: unknown}> = Omit<P, 'children'> & {
    children?: P['children'];
};

export const dragDropContext =
        elementFactory<OptionalChildren<DragDropContextProps>>(DragDropContext),
    droppable = elementFactory<OptionalChildren<DroppableProps>>(Droppable),
    draggable = elementFactory<OptionalChildren<DraggableProps>>(Draggable);
