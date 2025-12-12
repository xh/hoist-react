/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {box, div, hframe, span} from '@xh/hoist/cmp/layout';
import {TabContainerModel, TabSwitcherProps} from '@xh/hoist/cmp/tab';
import {hoistCmp, HoistModel, useLocalModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {
    menu,
    menuItem,
    popover,
    tab as bpTab,
    tabs as bpTabs,
    tooltip as bpTooltip
} from '@xh/hoist/kit/blueprint';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {consumeEvent, debounced, getTestId, isDisplayed, throwIf} from '@xh/hoist/utils/js';
import {
    createObservableRef,
    getLayoutProps,
    useOnResize,
    useOnScroll,
    useOnVisibleChange
} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, isFinite} from 'lodash';
import {CSSProperties, ReactElement, KeyboardEvent} from 'react';

/**
 * Component to indicate and control the active tab of a TabContainer.
 *
 * The orientation property controls how this switcher will be rendered.
 * For 'top' or 'bottom' orientations this switcher will be rendered in horizontal mode.
 * For 'left' or 'right' orientations this switcher will be rendered in vertical mode.
 *
 * Overflowing tabs can be displayed in a dropdown menu if `enableOverflow` is true.
 * Note that in order for tabs to overflow, the TabSwitcher or it's wrapper must have a
 * maximum width.
 */
export const [TabSwitcher, tabSwitcher] = hoistCmp.withFactory<TabSwitcherProps>({
    displayName: 'TabSwitcher',
    model: uses(TabContainerModel),
    className: 'xh-tab-switcher',

    render(
        {
            model,
            className,
            orientation = 'top',
            animate = false,
            enableOverflow = false,
            tabWidth,
            tabMinWidth,
            tabMaxWidth,
            ...props
        },
        ref
    ) {
        throwIf(
            !['top', 'bottom', 'left', 'right'].includes(orientation),
            'Unsupported value for orientation.'
        );

        const {tabs, activeTabId} = model,
            layoutProps = getLayoutProps(props),
            vertical = ['left', 'right'].includes(orientation),
            impl = useLocalModel(() => new TabSwitcherLocalModel(model, enableOverflow, vertical));

        // Implement overflow
        ref = impl.enableOverflow
            ? composeRefs(
                  ref,
                  impl.switcherRef,
                  useOnResize(() => impl.updateOverflowTabs()),
                  useOnVisibleChange(() => impl.updateOverflowTabs()),
                  useOnScroll(() => impl.updateOverflowTabs())
              )
            : composeRefs(ref, impl.switcherRef);

        // Create tabs
        const tabStyle: CSSProperties = {};
        if (!vertical && isFinite(tabWidth)) tabStyle.width = tabWidth + 'px';
        if (!vertical && isFinite(tabMinWidth)) tabStyle.minWidth = tabMinWidth + 'px';
        if (!vertical && isFinite(tabMaxWidth)) tabStyle.maxWidth = tabMaxWidth + 'px';

        const items = tabs.map(tab => {
            const {id, title, icon, disabled, tooltip, showRemoveAction, excludeFromSwitcher} = tab,
                testId = getTestId(props, id);

            if (excludeFromSwitcher) return null;
            return bpTab({
                id,
                disabled,
                style: tabStyle,
                item: bpTooltip({
                    content: tooltip as ReactElement,
                    disabled: !tooltip,
                    hoverOpenDelay: 1000,
                    position: flipOrientation(orientation),
                    item: hframe({
                        className: 'xh-tab-switcher__tab',
                        tabIndex: -1,
                        testId,
                        items: [
                            icon,
                            span(title),
                            button({
                                testId: getTestId(testId, 'remove-btn'),
                                omit: !showRemoveAction,
                                tabIndex: -1,
                                icon: Icon.x(),
                                onClick: () => tab.containerModel.removeTab(tab)
                            })
                        ]
                    })
                })
            });
        });

        return box({
            ...layoutProps,
            testId: props.testId,
            className: classNames(
                className,
                `xh-tab-switcher--${orientation}`,
                enableOverflow ? `xh-tab-switcher--overflow-enabled` : null
            ),
            items: [
                div({
                    ref,
                    className: `xh-tab-switcher__scroll`,
                    item: bpTabs({
                        id: model.xhId,
                        vertical,
                        animate,
                        items,
                        selectedTabId: activeTabId,
                        onChange: tabId => model.activateTab(tabId as string)
                    }),
                    onKeyDown: e => impl.onKeyDown(e)
                }),
                overflowMenu({
                    tabs: impl.overflowTabs,
                    vertical
                })
            ]
        });
    }
});

//-----------------
// Implementation
//-----------------
const overflowMenu = hoistCmp.factory<TabContainerModel>({
    render({model, tabs, vertical}) {
        if (isEmpty(tabs)) return null;

        const items = tabs.map(tab => {
            const {id, title: text, icon, disabled, showRemoveAction} = tab;
            return menuItem({
                icon,
                text,
                disabled,
                onClick: () => model.activateTab(id),
                labelElement: button({
                    omit: !showRemoveAction,
                    icon: Icon.x(),
                    onClick: e => {
                        model.removeTab(id);
                        e.stopPropagation();
                    }
                })
            });
        });

        return popover({
            popoverClassName: 'xh-tab-switcher__overflow-popover',
            position: 'bottom-right',
            item: button({
                icon: vertical ? Icon.ellipsisHorizontal() : Icon.ellipsisVertical()
            }),
            minimal: true,
            content: menu({
                className: 'xh-tab-switcher__overflow-menu',
                items
            })
        });
    }
});

class TabSwitcherLocalModel extends HoistModel {
    override xhImpl = true;

    @bindable.ref overflowIds = [];
    switcherRef = createObservableRef<HTMLElement>();
    model;
    enableOverflow;
    vertical;

    get overflowTabs() {
        return compact(this.overflowIds.map(id => this.model.findTab(id)));
    }

    onKeyDown(e: KeyboardEvent) {
        const {key} = e,
            {model, vertical} = this;
        if ((key === 'ArrowDown' && vertical) || (key === 'ArrowRight' && !vertical)) {
            model.activateNextTab(true);
            consumeEvent(e);
        } else if ((key === 'ArrowUp' && vertical) || (key === 'ArrowLeft' && !vertical)) {
            model.activatePrevTab(true);
            consumeEvent(e);
        }
    }

    constructor(model, enableOverflow, vertical) {
        super();
        makeObservable(this);
        this.model = model;
        this.enableOverflow = enableOverflow;
        this.vertical = vertical;

        if (enableOverflow) {
            this.addReaction({
                track: () => [this.switcherRef.current, model.tabs],
                run: () => this.updateOverflowTabs()
            });

            this.addReaction({
                track: () => [model.activeTabId, model.tabs],
                run: () => this.scrollActiveTabIntoView()
            });
        }
    }

    //------------------------
    // Implementation
    //------------------------
    @debounced(100)
    updateOverflowTabs() {
        this.overflowIds = this.getOverflowIds();
    }

    // Debounce allows tab changes to render before scrolling into view
    @debounced(1)
    scrollActiveTabIntoView() {
        if (!this.enableOverflow) return;
        const tab = this.tabEls.find(
            (tab: HTMLElement) => tab.dataset.tabId === this.model.activeTabId
        );
        if (tab) tab.scrollIntoView();
    }

    getOverflowIds() {
        const {enableOverflow, dimensions} = this;
        if (!enableOverflow || !dimensions) return [];

        const {client, scroll, scrollPosition} = dimensions;
        if (scroll <= client) return [];

        const visibleStart = scrollPosition,
            visibleEnd = scrollPosition + client,
            ids = [];

        this.tabEls.forEach((tab: any) => {
            // Tabs are considered overflowed if they are at least 25% obscured
            const {start, length, end} = this.getTabDimensions(tab),
                buffer = Math.round(length * 0.25),
                overflowed = start < visibleStart - buffer || end > visibleEnd + buffer;

            if (overflowed) ids.push(tab.dataset.tabId);
        });

        return ids;
    }

    get el() {
        return this.switcherRef?.current;
    }

    get dimensions() {
        const {el, vertical} = this;
        if (!el || !isDisplayed(el)) return null;

        const client = vertical ? el.clientHeight : el.clientWidth,
            scroll = vertical ? el.scrollHeight : el.scrollWidth,
            scrollPosition = vertical ? el.scrollTop : el.scrollLeft;

        return {client, scroll, scrollPosition};
    }

    get tabEls() {
        if (!this.el) return [];
        return Array.from(this.el.querySelectorAll('.bp6-tab'));
    }

    getTabDimensions(tab) {
        const {vertical} = this,
            length = vertical ? tab.offsetHeight : tab.offsetWidth,
            start = vertical ? tab.offsetTop : tab.offsetLeft,
            end = start + length;

        return {length, start, end};
    }
}

function flipOrientation(orientation) {
    switch (orientation) {
        case 'top':
            return 'bottom';
        case 'bottom':
            return 'top';
        case 'left':
            return 'right';
        case 'right':
            return 'left';
    }
}
