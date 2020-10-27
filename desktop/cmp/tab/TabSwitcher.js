/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';
import {hoistCmp, uses} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {tab as blueprintTab, tabs as blueprintTabs, popover, menu, menuItem} from '@xh/hoist/kit/blueprint';
import {createObservableRef, useOnResize, useOnVisibleChange, useOnScroll} from '@xh/hoist/utils/react';
import {debounced, withDefault, isDisplayed} from '@xh/hoist/utils/js';
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
 * @see TabContainer
 * @see TabContainerModel
 */
export const [TabSwitcher, tabSwitcher] = hoistCmp.withFactory({
    displayName: 'TabSwitcher',
    model: uses(TabContainerModel),
    className: 'xh-tab-switcher',

    render({model, className, animate, ...props}) {
        const {id, tabs, activeTabId} = model,
            orientation = withDefault(props.orientation, 'top'),
            vertical = ['left', 'right'].includes(orientation);

        const impl = useLocalModel(() => new LocalModel(model, vertical)),
            ref = composeRefs(
                impl.switcherRef,
                useOnResize(() => impl.updateOverflowTabs()),
                useOnVisibleChange(() => impl.updateOverflowTabs()),
                useOnScroll(() => impl.updateOverflowTabs())
            );

        const items = tabs.map(tab => {
            const {id, title, icon, disabled, showRemoveAction, excludeFromSwitcher} = tab;
            if (excludeFromSwitcher) return null;
            return blueprintTab({
                id,
                disabled,
                items: [
                    icon,
                    title,
                    button({
                        omit: !showRemoveAction,
                        tabIndex: -1,
                        icon: Icon.x(),
                        onClick: () => tab.containerModel.removeTab(tab)
                    })
                ]
            });
        });

        return div({
            className: classNames(className, `xh-tab-switcher--${orientation}`),
            items: [
                div({
                    ref,
                    className: `xh-tab-switcher__scroll`,
                    item: blueprintTabs({
                        id,
                        vertical,
                        onChange: (tabId) => model.activateTab(tabId),
                        selectedTabId: activeTabId,
                        items,
                        ...props,
                        animate: withDefault(animate, false)
                    })
                }),
                overflowMenu({tabs: impl.overflowTabs})
            ]
        });
    }
});

TabSwitcher.propTypes = {
    /** True to animate the indicator when switching tabs. False (default) to change instantly. */
    animate: PT.bool,

    /** Primary component model instance. */
    model: PT.instanceOf(TabContainerModel),

    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
};

//-----------------
// Implementation
//-----------------
const overflowMenu = hoistCmp.factory({
    render({model, tabs}) {
        if (!tabs?.length) return null;

        const items = tabs.map(tab => {
            const {id, title: text, icon, disabled} = tab;
            return menuItem({
                icon,
                text,
                disabled,
                onClick: () => model.activateTab(id)
            });
        });

        return popover({
            popoverClassName: 'xh-tab-switcher__overflow-popover',
            position: 'bottom-right',
            target: button({icon: Icon.ellipsisVertical()}),
            minimal: true,
            content: menu({items})
        });
    }
});

@HoistModel
class LocalModel {
    @bindable.ref overflowIds = []
    switcherRef = createObservableRef();
    model;
    vertical;

    get overflowTabs() {
        return this.overflowIds.map(id => this.model.findTab(id));
    }

    constructor(model, vertical) {
        this.model = model;
        this.vertical = vertical;

        this.addReaction({
            track: () => [this.switcherRef.current, this.model.tabs],
            run: () => this.updateOverflowTabs()
        });

        this.addReaction({
            track: () => this.model.activeTabId,
            run: () => this.scrollActiveTabIntoView()
        });
    }

    @debounced(100)
    updateOverflowTabs() {
        const {dimensions} = this;
        if (!dimensions) return;

        const {client, scroll, scrollPosition} = dimensions;
        if (scroll < client) return;

        const visibleStart = scrollPosition,
            visibleEnd = scrollPosition + client,
            ids = [];

        this.tabEls.forEach(tab => {
            const {start, end} = this.getTabDimensions(tab);
            if (start < visibleStart || end > visibleEnd) {
                ids.push(tab.dataset.tabId);
            }
        });

        this.setOverflowIds(ids);
    }

    scrollActiveTabIntoView() {
        const tab = this.tabEls.find(tab => tab.dataset.tabId === this.model.activeTabId);
        if (tab) tab.scrollIntoView();
    }

    get el() {
        return this.switcherRef?.current;
    }

    get dimensions() {
        const {el} = this;
        if (!el || !isDisplayed(el)) return null;

        const {vertical} = this,
            client = vertical ? el.clientHeight : el.clientWidth,
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