/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {box, div, span, hframe} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';
import {hoistCmp, uses} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {tab as bpTab, tabs as bpTabs, tooltip as bpTooltip, popover, menu, menuItem} from '@xh/hoist/kit/blueprint';
import {getLayoutProps, createObservableRef, useOnResize, useOnVisibleChange, useOnScroll} from '@xh/hoist/utils/react';
import {debounced, throwIf, isDisplayed} from '@xh/hoist/utils/js';
import {isEmpty, compact} from 'lodash';
import classNames from 'classnames';
import PT from 'prop-types';
import composeRefs from '@seznam/compose-react-refs';

/**
 * Component to indicate and control the active tab of a TabContainer.
 *
 * The orientation property controls how this switcher will be rendered.
 * For 'top' or 'bottom' orientations this switcher will be rendered in horizontal mode.
 * For 'left' or 'right' orientations this switcher will be rendered in vertical mode.
 *
 * Overflowing tabs can be displayed in a dropdown menu if `enableOverflow` is true.
 * Note that in order for tabs to overflow, the TabSwitcher or it's wrapper must have a
 * a maximum width.
 *
 * @see TabContainer
 * @see TabContainerModel
 */
export const [TabSwitcher, tabSwitcher] = hoistCmp.withFactory({
    displayName: 'TabSwitcher',
    model: uses(TabContainerModel),
    className: 'xh-tab-switcher',

    render({
        model,
        className,
        orientation = 'top',
        animate = false,
        enableOverflow = false,
        tabWidth,
        tabMinWidth,
        tabMaxWidth,
        ...props
    }) {
        throwIf(!['top', 'bottom', 'left', 'right'].includes(orientation), 'Unsupported value for orientation.');

        const {id, tabs, activeTabId} = model,
            layoutProps = getLayoutProps(props),
            vertical = ['left', 'right'].includes(orientation),
            impl = useLocalModel(() => new LocalModel(model, enableOverflow, vertical));

        // Implement overflow
        let ref = impl.switcherRef;
        if (impl.enableOverflow) {
            ref = composeRefs(
                impl.switcherRef,
                useOnResize(() => impl.updateOverflowTabs()),
                useOnVisibleChange(() => impl.updateOverflowTabs()),
                useOnScroll(() => impl.updateOverflowTabs())
            );
        }

        // Create tabs
        const tabStyle = {};
        if (!vertical && isFinite(tabWidth)) tabStyle.width = tabWidth + 'px';
        if (!vertical && isFinite(tabMinWidth)) tabStyle.minWidth = tabMinWidth + 'px';
        if (!vertical && isFinite(tabMaxWidth)) tabStyle.maxWidth = tabMaxWidth + 'px';

        const items = tabs.map(tab => {
            const {id, title, icon, disabled, tooltip, showRemoveAction, excludeFromSwitcher} = tab;
            if (excludeFromSwitcher) return null;
            return bpTab({
                id,
                disabled,
                style: tabStyle,
                item: bpTooltip({
                    content: tooltip,
                    disabled: !tooltip,
                    boundary: 'viewport',
                    hoverOpenDelay: 1000,
                    position: flipOrientation(orientation),
                    item: hframe({
                        className: 'xh-tab-switcher__tab',
                        tabIndex: -1,
                        items: [
                            icon,
                            span(title),
                            button({
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
                        id,
                        vertical,
                        animate,
                        items,
                        selectedTabId: activeTabId,
                        onChange: (tabId) => model.activateTab(tabId)
                    })
                }),
                overflowMenu({
                    tabs: impl.overflowTabs,
                    vertical
                })
            ]
        });
    }
});

TabSwitcher.propTypes = {
    /** Primary component model instance. */
    model: PT.instanceOf(TabContainerModel),

    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation: PT.oneOf(['top', 'bottom', 'left', 'right']),

    /** True to animate the indicator when switching tabs. False (default) to change instantly. */
    animate: PT.bool,

    /** Enable scrolling and place tabs that overflow into a menu. Default to false. */
    enableOverflow: PT.bool,

    /** Width (in px) to render tabs. Only applies to horizontal orientations */
    tabWidth: PT.number,

    /** Minimum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMinWidth: PT.number,

    /** Maximum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMaxWidth: PT.number
};

//-----------------
// Implementation
//-----------------
const overflowMenu = hoistCmp.factory({
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
                    onClick: (e) => {
                        model.removeTab(id);
                        e.stopPropagation();
                    }
                })
            });
        });

        return popover({
            popoverClassName: 'xh-tab-switcher__overflow-popover',
            position: 'bottom-right',
            target: button({
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

@HoistModel
class LocalModel {
    @bindable.ref overflowIds = [];
    switcherRef = createObservableRef();
    model;
    enableOverflow;
    vertical;

    get overflowTabs() {
        return compact(this.overflowIds.map(id => this.model.findTab(id)));
    }

    constructor(model, enableOverflow, vertical) {
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
        const ids = this.getOverflowIds();
        this.setOverflowIds(ids);
    }

    // Debounce allows tab changes to render before scrolling into view
    @debounced(1)
    scrollActiveTabIntoView() {
        if (!this.enableOverflow) return;
        const tab = this.tabEls.find(tab => tab.dataset.tabId === this.model.activeTabId);
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

        this.tabEls.forEach(tab => {
            // Tabs are considered overflowed if they are at least 25% obscured
            const {start, length, end} = this.getTabDimensions(tab),
                buffer = Math.round(length * 0.25),
                overflowed = start < (visibleStart - buffer) || end > (visibleEnd + buffer);

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
        return Array.from(this.el.querySelectorAll('.bp3-tab'));
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
        case 'top': return 'bottom';
        case 'bottom': return 'top';
        case 'left': return 'right';
        case 'right': return 'left';
    }
}