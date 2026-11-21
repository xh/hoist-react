/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import type {ReactNode} from 'react';
import {createElement as h, useLayoutEffect, useRef, useState} from 'react';

export interface OverflowListProps extends HoistProps {
    items: ReactNode[];
    /** Renders the items that do not fit - called only when there are some. */
    overflowRenderer: (items: ReactNode[]) => ReactNode;
    /** Side the items overflow from. Default 'start'. */
    collapseFrom?: 'start' | 'end';
    /** Items that always stay visible, however little room there is. */
    minVisibleItems?: number;
}

interface PartitionState {
    visible: ReactNode[];
    overflow: ReactNode[];
    /** Items to move in the next step of the search. */
    chopSize: number;
    lastChopSize: number;
    repartitioning: boolean;
}

/**
 * A row of items that moves those that do not fit into an overflow renderer, such as a menu.
 *
 * A one-pixel spacer ends the row. While it is squeezed to nothing, items overflow, so a binary
 * search moves items to or from the overflow until the rest just fit. The search runs again when
 * the row resizes or its items change.
 * @internal
 */
export const overflowList = hoistCmp.factory<OverflowListProps>({
    displayName: 'OverflowList',
    model: false,
    observer: false,

    render({items, overflowRenderer, collapseFrom = 'start', minVisibleItems = 0}) {
        const listRef = useRef<HTMLDivElement>(null),
            spacerRef = useRef<HTMLDivElement>(null),
            [state, setState] = useState<PartitionState>(() => initialState(items)),
            lastItems = useRef(items);

        // Start over whenever the items or settings change.
        useLayoutEffect(() => {
            if (lastItems.current === items) return;
            lastItems.current = items;
            setState(initialState(items));
        }, [items, collapseFrom, minVisibleItems]);

        const repartition = () => {
            const spacer = spacerRef.current;
            if (!spacer) return;
            setState(s => {
                const exhausted = s.lastChopSize === 1,
                    shrink = spacer.offsetWidth < 0.9 && s.visible.length > minVisibleItems,
                    grow =
                        (spacer.offsetWidth >= 1 || s.visible.length < minVisibleItems) &&
                        s.overflow.length > 0 &&
                        !exhausted;

                if (!shrink && !grow) {
                    // Settled - return the same state when nothing changes, to skip a re-render.
                    const chopSize = halve(items.length);
                    return s.repartitioning || s.chopSize !== chopSize || s.lastChopSize != null
                        ? {...s, chopSize, lastChopSize: null, repartitioning: false}
                        : s;
                }

                let visible: ReactNode[], overflow: ReactNode[];
                if (collapseFrom === 'end') {
                    [visible, overflow] = shift(
                        s.visible,
                        s.overflow,
                        s.chopSize * (shrink ? 1 : -1)
                    );
                } else {
                    [overflow, visible] = shift(
                        s.overflow,
                        s.visible,
                        s.chopSize * (shrink ? -1 : 1)
                    );
                }
                return {
                    visible,
                    overflow,
                    chopSize: halve(s.chopSize),
                    lastChopSize: s.chopSize,
                    repartitioning: true
                };
            });
        };

        // Each step of the search renders, then measures again here until it settles. Once settled,
        // only a resize or new items start it again.
        useLayoutEffect(() => {
            if (state.repartitioning) repartition();
        }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

        // Search again when the row resizes, with the latest items and settings.
        const repartitionRef = useRef(repartition);
        repartitionRef.current = repartition;
        useLayoutEffect(() => {
            const el = listRef.current;
            if (!el || typeof ResizeObserver === 'undefined') return;
            const observer = new ResizeObserver(() => repartitionRef.current());
            observer.observe(el);
            return () => observer.disconnect();
        }, []);

        const overflow = state.overflow.length ? overflowRenderer(state.overflow.slice()) : null;
        return h(
            'div',
            {ref: listRef, className: 'xh-overflow-list'},
            collapseFrom === 'start' ? overflow : null,
            ...state.visible,
            collapseFrom === 'end' ? overflow : null,
            h('div', {
                ref: spacerRef,
                className: 'xh-overflow-list__spacer'
            })
        );
    }
});

//------------------------
// Implementation
//------------------------
// A fresh state shows every item, and starts a search.
function initialState(items: ReactNode[]): PartitionState {
    return {
        visible: items,
        overflow: [],
        chopSize: halve(items.length),
        lastChopSize: null,
        repartitioning: true
    };
}

function halve(num: number): number {
    return Math.ceil(num / 2);
}

/** Move `num` items from the end of `left` to the start of `right` - or back, when negative. */
function shift(left: ReactNode[], right: ReactNode[], num: number): [ReactNode[], ReactNode[]] {
    const all = left.concat(right),
        newLeftLength = left.length - num;
    if (newLeftLength <= 0) return [[], all];
    if (newLeftLength >= all.length) return [all, []];
    return [all.slice(0, newLeftLength), all.slice(newLeftLength)];
}
