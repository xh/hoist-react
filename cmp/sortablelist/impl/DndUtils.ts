/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {findKey, mapValues} from 'lodash';
import type {KeyboardEvent} from 'react';

export type SortableKey = string | number;

/**
 * Move `sourceKey` onto `targetKey` within keyed lists - taking the target's slot within one list,
 * or inserting before it in another. Returns `lists` itself if nothing would change.
 */
export function moveItem<T extends Record<string, SortableKey[]>>(
    lists: T,
    sourceKey: SortableKey,
    targetGroup: string,
    targetKey: SortableKey
): T {
    const targetIdx = lists[targetGroup]?.indexOf(targetKey) ?? -1,
        sourceGroup = findKey(lists, keys => keys.includes(sourceKey));
    if (sourceKey === targetKey || targetIdx < 0 || sourceGroup == null) return lists;

    const ret = mapValues(lists, keys => keys.filter(k => k !== sourceKey)) as T,
        target = ret[targetGroup];
    (ret as Record<string, SortableKey[]>)[targetGroup] = [
        ...target.slice(0, targetIdx),
        sourceKey,
        ...target.slice(targetIdx)
    ];
    return ret;
}

/**
 * The index to move `key` to within `allKeys` so it lands where `order` - a subset of `allKeys` in
 * its new order - puts it: just before its successor in `order`, else just after its predecessor.
 * Returns -1 if `order` places it next to nothing.
 */
export function moveIndexForOrder(
    allKeys: SortableKey[],
    key: SortableKey,
    order: SortableKey[]
): number {
    const pos = order.indexOf(key),
        from = allKeys.indexOf(key),
        next = allKeys.indexOf(order[pos + 1]),
        prev = allKeys.indexOf(order[pos - 1]);
    if (pos < 0 || from < 0) return -1;
    if (next >= 0) return from < next ? next - 1 : next;
    if (prev >= 0) return from < prev ? prev : prev + 1;
    return -1;
}

/**
 * Keep the keys a keyboard drag uses from an ancestor's shortcuts - e.g. Escape closing the dialog
 * that holds the list. Call from the drag handle's `onKeyDown`.
 */
export function stopDragKeys(e: KeyboardEvent, isDragging: boolean) {
    const {key} = e;
    if (
        key === ' ' ||
        key === 'Enter' ||
        (isDragging && (key === 'Escape' || key.startsWith('Arrow')))
    ) {
        e.stopPropagation();
    }
}
