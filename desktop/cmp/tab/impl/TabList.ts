/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import type {CSSProperties, FC, KeyboardEvent, MouseEvent, ReactNode} from 'react';
import {createElement as h, useLayoutEffect, useRef, useState} from 'react';

const TAB_SELECTOR = '.bp6-tab';

export interface TabListProps {
    /** Id of the switcher, used to build ids for its tabs. */
    id: string;
    selectedTabId: string;
    vertical?: boolean;
    /** True to slide an indicator to the selected tab. */
    animate?: boolean;
    /** Tabs from `tabTitle`, with any headers or spacers between them. */
    children: ReactNode[];
}

/**
 * The strip of tabs in a `TabSwitcher`. Arrow keys move focus between enabled tabs, and Enter or
 * Space selects the focused one. Renders the same elements, ids and class names as Blueprint's
 * `Tabs`, so its styles and any app CSS keyed to them still apply.
 * @internal
 */
export const TabList: FC<TabListProps> = ({id, selectedTabId, vertical, animate, children}) => {
    const listRef = useRef<HTMLDivElement>(null),
        [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>(null),
        firstRender = useRef(true);

    // Size and place the indicator over the selected tab, moving without a transition at first.
    useLayoutEffect(() => {
        if (!animate) return;
        const selected = listRef.current?.querySelector<HTMLElement>(
            `${TAB_SELECTOR}[data-tab-id="${CSS.escape(String(selectedTabId))}"]`
        );
        const style: CSSProperties = selected
            ? {
                  height: selected.clientHeight,
                  width: selected.clientWidth,
                  transform: `translateX(${Math.floor(selected.offsetLeft)}px) translateY(${Math.floor(selected.offsetTop)}px)`,
                  ...(firstRender.current ? {transition: 'none'} : null)
              }
            : {display: 'none'};
        firstRender.current = false;
        setIndicatorStyle(style);
    }, [animate, selectedTabId, children]);

    const onKeyDown = (e: KeyboardEvent) => {
        const direction = ['ArrowLeft', 'ArrowUp'].includes(e.key)
            ? -1
            : ['ArrowRight', 'ArrowDown'].includes(e.key)
              ? 1
              : 0;
        const focused = (document.activeElement as HTMLElement)?.closest(TAB_SELECTOR);
        if (!direction || !focused) return;
        const tabs = Array.from(
                listRef.current.querySelectorAll<HTMLElement>(
                    `${TAB_SELECTOR}[aria-disabled="false"]`
                )
            ),
            idx = tabs.indexOf(focused as HTMLElement);
        if (idx < 0) return;
        e.preventDefault();
        tabs[(idx + direction + tabs.length) % tabs.length].focus();
    };

    const onKeyPress = (e: KeyboardEvent) => {
        const tab = (e.target as HTMLElement).closest<HTMLElement>(TAB_SELECTOR);
        if (tab && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            tab.click();
        }
    };

    return h(
        'div',
        {className: classNames('bp6-tabs', {'bp6-vertical': vertical})},
        h(
            'div',
            {
                ref: listRef,
                role: 'tablist',
                className: 'bp6-tab-list',
                onKeyDown,
                onKeyPress
            },
            animate
                ? h(
                      'div',
                      {className: 'bp6-tab-indicator-wrapper', style: indicatorStyle},
                      h('div', {className: 'bp6-tab-indicator'})
                  )
                : null,
            ...children
        )
    );
};

export interface TabTitleProps {
    /** Id of the switcher holding the tab. */
    parentId: string;
    id: string;
    selected: boolean;
    disabled?: boolean;
    style?: CSSProperties;
    onSelect: (id: string) => void;
    onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
    children?: ReactNode;
}

/**
 * One tab in a {@link TabList}.
 * @internal
 */
export const TabTitle: FC<TabTitleProps> = ({
    parentId,
    id,
    selected,
    disabled,
    style,
    onSelect,
    onContextMenu,
    children
}) =>
    h(
        'div',
        {
            role: 'tab',
            id: `bp6-tab-title_${parentId}_${id}`,
            'aria-controls': `bp6-tab-panel_${parentId}_${id}`,
            'aria-disabled': !!disabled,
            'aria-expanded': selected,
            'aria-selected': selected,
            'data-tab-id': id,
            className: 'bp6-tab',
            tabIndex: disabled ? undefined : selected ? 0 : -1,
            style,
            onClick: disabled ? undefined : () => onSelect(id),
            onContextMenu
        },
        children
    );
