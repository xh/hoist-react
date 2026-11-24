/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DragDropManager, DragDropProviderProps} from '@xh/hoist/kit/dnd-kit';
import {
    Accessibility,
    AutoScroller,
    Feedback,
    isSortable,
    KeyboardSensor,
    PointerActivationConstraints,
    PointerSensor,
    Plugin
} from '@xh/hoist/kit/dnd-kit';
import './Dnd.scss';

/**
 * Hoist's drag-and-drop defaults, shared by `SortableList` and the components that use dnd-kit
 * directly. Announcements read each sortable's `data.label` and `data.count`.
 */
export const DND_TRANSITION = {duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)'};

// A drag starts on a 200ms hold - the lifted item is the cue that it's held - or, for a mouse, as
// soon as it moves 4px, whichever comes first. Touch waits for the hold so a finger can scroll.
const POINTER_SENSOR = PointerSensor.configure({
    activationConstraints: (e: PointerEvent) => {
        const hold = new PointerActivationConstraints.Delay({value: 200, tolerance: 5});
        return e.pointerType === 'touch'
            ? [hold]
            : [hold, new PointerActivationConstraints.Distance({value: 4})];
    }
});

export const DND_SENSORS: DragDropProviderProps['sensors'] = [POINTER_SENSOR, KeyboardSensor];

/** For items whose Enter key has its own job, such as tabs - only Space lifts them. */
export const DND_SPACE_LIFT_SENSORS: DragDropProviderProps['sensors'] = [
    POINTER_SENSOR,
    KeyboardSensor.configure({
        keyboardCodes: {...KeyboardSensor.defaults.keyboardCodes, start: ['Space']}
    })
];

/** Hoist's auto-scroll speed - below dnd-kit's default of 25. */
export const DND_SCROLL_ACCELERATION = 15;

/** Hoist's plugins, with auto-scroll at `scrollAcceleration`. */
export function dndPlugins(
    scrollAcceleration: number = DND_SCROLL_ACCELERATION
): DragDropProviderProps['plugins'] {
    return [ACCESSIBILITY, AutoScroller.configure({acceleration: scrollAcceleration}), ...REST];
}

/**
 * Clears any text selection while a drag is in progress, and during a pointer drag marks the
 * dragged item's container with `xh-dnd-pointer-drag`, which shows the grabbing cursor and blocks
 * selection within it. Stands in for dnd-kit's Cursor and PreventSelection plugins, which add and
 * remove a page-wide `*` style rule on every drag, making the browser restyle and lay out the
 * whole page as the drag starts.
 */
export class ScopedDragStyles extends Plugin<DragDropManager> {
    private scope: Element = null;

    constructor(manager: DragDropManager) {
        super(manager);
        const {monitor} = manager,
            offStart = monitor.addEventListener('dragstart', ({operation, nativeEvent}) => {
                if (this.isDisabled()) return;
                this.clearSelection();
                document.addEventListener('selectionchange', this.clearSelection, true);
                if (nativeEvent instanceof KeyboardEvent) return;
                this.scope = operation.source?.element?.parentElement;
                this.scope?.classList.add(POINTER_DRAG_CLS);
            }),
            offEnd = monitor.addEventListener('dragend', () => this.end());
        this.registerEffect(() => () => {
            offStart();
            offEnd();
        });
    }

    override destroy() {
        this.end();
        super.destroy();
    }

    private clearSelection = () => document.getSelection()?.removeAllRanges();

    private end() {
        document.removeEventListener('selectionchange', this.clearSelection, true);
        this.scope?.classList.remove(POINTER_DRAG_CLS);
        this.scope = null;
    }
}

const POINTER_DRAG_CLS = 'xh-dnd-pointer-drag';

const ACCESSIBILITY = Accessibility.configure({
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
    REST = [Feedback.configure({dropAnimation: DND_TRANSITION}), ScopedDragStyles];

export const DND_PLUGINS = dndPlugins();
