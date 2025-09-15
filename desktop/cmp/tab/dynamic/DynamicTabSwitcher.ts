import composeRefs from '@seznam/compose-react-refs';
import {div, hframe} from '@xh/hoist/cmp/layout';
import {TabModel} from '@xh/hoist/cmp/tab';
import {hoistCmp, HoistProps, useContextModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {hScroller} from '@xh/hoist/desktop/cmp/tab/dynamic/hscroller/HScroller';
import {HScrollerModel} from '@xh/hoist/desktop/cmp/tab/dynamic/hscroller/HScrollerModel';
import {DynamicTabConfig} from '@xh/hoist/desktop/cmp/tab/dynamic/Types';
import {Icon} from '@xh/hoist/icon';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {wait} from '@xh/hoist/promise';
import {consumeEvent} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {first} from 'lodash';
import {CSSProperties, ReactElement, Ref, useEffect, useRef} from 'react';
import {DynamicTabSwitcherModel} from './DynamicTabSwitcherModel';
import './DynamicTabSwitcher.scss';

/**
 * A tab switcher that displays tabs as draggable items in a horizontal list.
 * Tabs can be added, removed, reordered and favorited with persistence.
 */

export const [DynamicTabSwitcher, dynamicTabSwitcher] = hoistCmp.withFactory({
    className: 'xh-dynamic-tab-switcher',
    displayName: 'DynamicTabSwitcher',
    model: uses(DynamicTabSwitcherModel),
    render({className}) {
        return hframe({
            className,
            item: hScroller({content: tabs})
        });
    }
});

interface TabsProps extends HoistProps<DynamicTabSwitcherModel> {
    ref: Ref<HTMLDivElement>;
}

const tabs = hoistCmp.factory<TabsProps>(({model}, ref) => {
    const {visibleTabs} = model;
    return dragDropContext({
        onDragEnd: result => model.onDragEnd(result),
        item: droppable({
            droppableId: model.xhId,
            direction: 'horizontal',
            children: provided =>
                div({
                    className: 'xh-dynamic-tab-switcher__tabs xh-tab-switcher xh-tab-switcher--top',
                    ref: composeRefs(provided.innerRef, ref),
                    item: div({
                        className: 'bp5-tabs',
                        item: div({
                            className: 'bp5-tab-list',
                            items: [
                                visibleTabs.map((tab, index) => tabCmp({key: tab.id, tab, index})),
                                provided.placeholder
                            ]
                        })
                    })
                })
        })
    });
});

interface TabProps extends HoistProps<DynamicTabSwitcherModel> {
    tab: TabModel | DynamicTabConfig;
    index: number;
}

const tabCmp = hoistCmp.factory<TabProps>(({tab, index, model}) => {
    const isActive = model.isTabActive(tab.id),
        isCloseable =
            tab.disabled ||
            model.enabledVisibleTabs.filter(it => it instanceof TabModel).length > 1,
        tabRef = useRef<HTMLDivElement>(),
        scrollerModel = useContextModel(HScrollerModel),
        {showScrollButtons} = scrollerModel,
        {disabled, icon, tooltip} = tab,
        isFavorite = model.isTabFavorite(tab.id);

    // Handle this at the component level rather than in the model since they are not "linked"
    useEffect(() => {
        if (isActive && showScrollButtons) {
            // Wait a tick for scroll buttons to render, then scroll to the active tab
            wait().then(() => tabRef.current.scrollIntoView({behavior: 'smooth'}));
        }
    }, [isActive, showScrollButtons]);

    return draggable({
        key: tab.id,
        draggableId: tab.id,
        index,
        children: (provided, snapshot) =>
            hframe({
                className: classNames(
                    'xh-dynamic-tab-switcher__tabs__tab',
                    isActive && 'xh-dynamic-tab-switcher__tabs__tab--active',
                    snapshot.isDragging && 'xh-dynamic-tab-switcher__tabs__tab--dragging'
                ),
                onClick: () => {
                    if (disabled) return;
                    if (tab instanceof TabModel) {
                        model.activate(tab.id);
                    } else {
                        tab.actionFn();
                    }
                },
                onContextMenu: e => model.onContextMenu(e, tab),
                ref: composeRefs(provided.innerRef, tabRef),
                ...provided.draggableProps,
                ...provided.dragHandleProps,
                style: getStyles(provided.draggableProps.style),
                items: [
                    div({
                        'aria-selected': isActive,
                        'aria-disabled': disabled,
                        className: 'bp5-tab',
                        item: bpTooltip({
                            content: tooltip as ReactElement,
                            disabled: !tooltip,
                            hoverOpenDelay: 1000,
                            position: 'bottom',
                            item: hframe({
                                className: 'xh-tab-switcher__tab',
                                tabIndex: -1,
                                items: [
                                    div({
                                        className: 'xh-dynamic-tab-switcher__tabs__tab__icon',
                                        item: icon,
                                        omit: !icon
                                    }),
                                    tab.title,
                                    button({
                                        className:
                                            'xh-dynamic-tab-switcher__tabs__tab__close-button',
                                        icon: Icon.x({size: 'sm'}),
                                        title: 'Remove Tab',
                                        minimal: true,
                                        onClick: e => {
                                            consumeEvent(e);
                                            model.hide(tab.id);
                                        },
                                        omit: isFavorite || !isCloseable
                                    })
                                ]
                            })
                        })
                    })
                ]
            })
    });
});

const getStyles = (style: CSSProperties): CSSProperties => {
    const {transform} = style;
    if (!transform) return style;

    return {
        ...style,
        // Only drag horizontally
        transform: `${first(transform.split(','))}, 0)`
    };
};
