/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {DragDropContext, Draggable, Droppable} from 'react-beautiful-dnd';

export {DragDropContext, Droppable, Draggable};

export const dragDropContext = elementFactory(DragDropContext),
    droppable = elementFactory(Droppable),
    draggable = elementFactory(Draggable);
