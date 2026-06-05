/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {SetOptional} from 'type-fest';


// Sourced from @hello-pangea/dnd, a maintained, React 19-ready, drop-in fork of the now-archived
// react-beautiful-dnd. The runtime API is identical, except for type tweak to children below.
import {DragDropContext, DragDropContextProps, Draggable, Droppable} from '@hello-pangea/dnd';


export {DragDropContext, Droppable, Draggable};
export const droppable = elementFactory(Droppable),
    draggable = elementFactory(Draggable);
export const dragDropContext =
    elementFactory<SetOptional<DragDropContextProps, 'children'>>(DragDropContext);
