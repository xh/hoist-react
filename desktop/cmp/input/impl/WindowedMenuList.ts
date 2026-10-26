/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {elementFactory} from '@xh/hoist/core';
import {isArray, isFunction} from 'lodash';
import {
    Children,
    cloneElement,
    isValidElement,
    ReactElement,
    ReactNode,
    Ref,
    RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef
} from 'react';
import type {MenuListProps} from 'react-select';
import {List, ListImperativeAPI, useDynamicRowHeight} from 'react-window';

/** Option count at or above which a `Select` in windowed mode virtualizes its menu. */
export const WINDOWED_OPTION_THRESHOLD = 100;

/** Estimated row heights, used until a row renders and is measured. */
const OPTION_HEIGHT = 35,
    GROUP_HEADING_HEIGHT = 25;

/** Flat count of the options in a react-select `options` array, which may be grouped. */
export function countOptions(options: any[]): number {
    let ret = 0;
    options.forEach(o => (ret += isArray(o.options) ? o.options.length : 1));
    return ret;
}

interface Row {
    node: ReactNode;
    /** The option, group or notice the row renders - carries its measured height across renders. */
    id: object;
    isFocused: boolean;
    estimate: number;
}

const reactWindowList = elementFactory(List);

/**
 * Replacement for react-select's `MenuList` that renders only the rows in view, for a `Select` in
 * windowed mode with a large option list. Each group heading, option and notice (no options,
 * loading) is a row. Rows are measured once rendered, so options of any height work, and the list
 * keeps the focused option in view as the user navigates with the keyboard.
 *
 * @internal
 */
export function WindowedMenuList(props: MenuListProps) {
    const {children, className, cx, getStyles, innerProps, innerRef, isMulti, maxHeight} = props,
        rows = useMemo(() => toRows(children), [children]),
        listRef = useRef<ListImperativeAPI>(null),
        // Heights by row id rather than index, so a measured option keeps its height when
        // filtering or keyboard navigation re-creates the rows.
        measured = useRef(new WeakMap<object, number>()),
        rowsVersion = useRef(0),
        prevRows = useRef<Row[]>(null);

    if (prevRows.current !== rows) {
        prevRows.current = rows;
        rowsVersion.current++;
    }

    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: OPTION_HEIGHT,
        initialRowHeights: rows.map(it => measured.current.get(it.id) ?? it.estimate),
        key: rowsVersion.current
    });

    useEffect(() => {
        rows.forEach((it, idx) => measured.current.set(it.id, rowHeight.getRowHeight(idx)));
    });

    // Scroll the focused option into view. This runs after react-select has tried to in its
    // `componentDidUpdate` - its scroll math assumes options in flow, so it lands at the top.
    const focusedIdx = rows.findIndex(it => it.isFocused);
    useEffect(() => {
        if (focusedIdx >= 0) listRef.current?.scrollToRow({index: focusedIdx, align: 'auto'});
    }, [focusedIdx, rows]);

    const setListRef = useCallback(
        (api: ListImperativeAPI) => {
            listRef.current = api;
            assignRef(innerRef, api?.element ?? null);
        },
        [innerRef]
    );

    const menuListStyles = getStyles('menuList', props),
        paddingTop = toPx(menuListStyles.paddingTop),
        paddingBottom = toPx(menuListStyles.paddingBottom),
        rowsHeight = rows.reduce((sum, it, idx) => sum + rowHeight.getRowHeight(idx), 0),
        height = Math.min(maxHeight, rowsHeight + paddingTop + paddingBottom);

    return reactWindowList({
        ...innerProps,
        className: cx({'menu-list': true, 'menu-list--is-multi': isMulti}, className),
        listRef: setListRef,
        rowComponent: windowedRow,
        rowCount: rows.length,
        rowHeight,
        rowProps: {rows, paddingTop},
        defaultHeight: height,
        // Rows are positioned from the top of the padding box, so offset them by the top padding
        // and reserve both paddings below the last row.
        style: {height, paddingBottom: paddingTop + paddingBottom}
    });
}

function windowedRow({index, style, rows, paddingTop}: any) {
    return div({style: {...style, top: paddingTop}, item: rows[index].node});
}

/** Flatten react-select's rendered menu children into rows, with each group heading on its own. */
function toRows(children: ReactNode): Row[] {
    const ret: Row[] = [];
    Children.toArray(children).forEach(child => {
        if (!isValidElement(child)) {
            ret.push({node: child, id: {}, isFocused: false, estimate: OPTION_HEIGHT});
            return;
        }
        const el = child as ReactElement<any>,
            {data, children: groupChildren} = el.props;
        if (isArray(data?.options)) {
            // A group renders its heading and its options. Render the heading alone, then each
            // option as a row of its own.
            ret.push({
                node: cloneElement(el, {}, []),
                id: data,
                isFocused: false,
                estimate: GROUP_HEADING_HEIGHT
            });
            Children.toArray(groupChildren).forEach(opt => ret.push(toOptionRow(opt)));
        } else {
            ret.push(toOptionRow(el));
        }
    });
    return ret;
}

function toOptionRow(node: ReactNode): Row {
    const props = isValidElement(node) ? (node as ReactElement<any>).props : {};
    return {
        node,
        id: props.data ?? props.innerProps ?? {},
        isFocused: !!props.isFocused,
        estimate: OPTION_HEIGHT
    };
}

function toPx(value: any): number {
    const ret = parseFloat(value);
    return isNaN(ret) ? 0 : ret;
}

function assignRef<T>(ref: Ref<T>, value: T) {
    if (isFunction(ref)) {
        ref(value);
    } else if (ref) {
        (ref as RefObject<T>).current = value;
    }
}
