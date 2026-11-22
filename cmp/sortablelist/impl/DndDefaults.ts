/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DragDropProviderProps} from '@xh/hoist/kit/dnd-kit';
import {
    Accessibility,
    AutoScroller,
    Cursor,
    Feedback,
    isSortable,
    KeyboardSensor,
    PointerActivationConstraints,
    PointerSensor,
    PreventSelection
} from '@xh/hoist/kit/dnd-kit';

/**
 * Hoist's drag-and-drop defaults, shared by `SortableList` and the components that use dnd-kit
 * directly. Announcements read each sortable's `data.label` and `data.count`.
 */
export const DND_TRANSITION = {duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)'};

const POINTER_SENSOR = PointerSensor.configure({
    activationConstraints: (e: PointerEvent) =>
        e.pointerType === 'touch'
            ? [new PointerActivationConstraints.Delay({value: 200, tolerance: 5})]
            : [new PointerActivationConstraints.Distance({value: 4})]
});

export const DND_SENSORS: DragDropProviderProps['sensors'] = [POINTER_SENSOR, KeyboardSensor];

/** For items whose Enter key has its own job, such as tabs - only Space lifts them. */
export const DND_SPACE_LIFT_SENSORS: DragDropProviderProps['sensors'] = [
    POINTER_SENSOR,
    KeyboardSensor.configure({
        keyboardCodes: {...KeyboardSensor.defaults.keyboardCodes, start: ['Space']}
    })
];

export const DND_PLUGINS: DragDropProviderProps['plugins'] = [
    Accessibility.configure({
        announcements: {
            dragstart: ({operation: {source}}) =>
                isSortable(source)
                    ? `Picked up ${source.data.label}, position ${source.index + 1} of ${source.data.count}.`
                    : undefined,
            dragover: ({operation: {source}}) =>
                isSortable(source)
                    ? `${source.data.label}, position ${source.index + 1} of ${source.data.count}.`
                    : undefined,
            dragend: ({operation: {source}, canceled}) => {
                if (!isSortable(source)) return undefined;
                const {label, count} = source.data;
                return canceled
                    ? `Cancelled. ${label} returned to position ${source.initialIndex + 1}.`
                    : `Dropped ${label} at position ${source.index + 1} of ${count}.`;
            }
        },
        screenReaderInstructions: {
            draggable:
                'To pick up the item, press Space or Enter. Use the arrow keys to move it, then ' +
                'press Space or Enter to drop it, or Escape to cancel. Alt with an arrow key ' +
                'moves it one place.'
        }
    }),
    AutoScroller,
    Cursor,
    Feedback.configure({dropAnimation: DND_TRANSITION}),
    PreventSelection
];
