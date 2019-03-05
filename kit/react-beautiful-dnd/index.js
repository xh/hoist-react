/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';

export {
    DragDropContext,
    Droppable,
    Draggable
};

export const
    dragDropContext = elemFactory(DragDropContext),
    droppable = elemFactory(Droppable),
    draggable = elemFactory(Draggable);