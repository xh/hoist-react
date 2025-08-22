/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {
    DragDropContext,
    Draggable,
    Droppable
} from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration';

export {DragDropContext, Droppable, Draggable};

export const dragDropContext = elementFactory(DragDropContext),
    droppable = elementFactory(Droppable),
    draggable = elementFactory(Draggable);
