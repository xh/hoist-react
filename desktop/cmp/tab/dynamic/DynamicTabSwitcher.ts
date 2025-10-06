import composeRefs from '@seznam/compose-react-refs';
import {div, hframe} from '@xh/hoist/cmp/layout';
import {TabModel} from '@xh/hoist/cmp/tab';
import {
    BoxProps,
    hoistCmp,
    HoistModel,
    HoistProps,
    Side,
    useContextModel,
    useLocalModel,
    uses
} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {scroller} from '@xh/hoist/desktop/cmp/tab/dynamic/scroller/Scroller';
import {ScrollerModel} from '@xh/hoist/desktop/cmp/tab/dynamic/scroller/ScrollerModel';
import {DynamicTabConfig} from '@xh/hoist/desktop/cmp/tab/dynamic/Types';
import {Icon} from '@xh/hoist/icon';
import {showContextMenu, tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {wait} from '@xh/hoist/promise';
import {consumeEvent} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {first, last} from 'lodash';
import {computed} from 'mobx';
import {CSSProperties, ReactElement, Ref, useEffect, useRef} from 'react';
import {DynamicTabSwitcherModel} from './DynamicTabSwitcherModel';
import './DynamicTabSwitcher.scss';

export interface DynamicTabSwitcherProps extends HoistProps<DynamicTabSwitcherModel>, BoxProps {
    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation?: Side;
}

/**
 * A tab switcher that displays tabs as draggable items in a horizontal list.
 * Tabs can be added, removed, reordered and favorited with persistence.
 */
export const [DynamicTabSwitcher, dynamicTabSwitcher] =
    hoistCmp.withFactory<DynamicTabSwitcherProps>({
        className: 'xh-dynamic-tab-switcher',
        displayName: 'DynamicTabSwitcher',
        model: uses(DynamicTabSwitcherModel),
        render({className, orientation, ...props}) {
            const impl = useLocalModel(DynamicTabSwitcherLocalModel);
            return scroller({
                className: classNames(className, impl.isVertical && `${className}--vertical`),
                content: tabs,
                contentProps: {localModel: impl},
                orientation: ['left', 'right'].includes(orientation) ? 'vertical' : 'horizontal',
                ...getLayoutProps(props)
            });
        }
    });

/**
 * Minimal local model to avoid prop drilling.
 */
class DynamicTabSwitcherLocalModel extends HoistModel {
    @computed
    get isVertical(): boolean {
        return ['left', 'right'].includes(this.props.orientation);
    }

    get props(): DynamicTabSwitcherProps {
        const ret = this.componentProps as DynamicTabSwitcherProps;
        return {
            ...ret,
            orientation: ret.orientation ?? 'top'
        };
    }
}

interface TabsProps extends HoistProps<DynamicTabSwitcherModel> {
    localModel: DynamicTabSwitcherLocalModel;
    ref: Ref<HTMLDivElement>;
}

const tabs = hoistCmp.factory<TabsProps>(({localModel, model}, ref) => {
    const {visibleTabs} = model,
        {isVertical, props} = localModel;
    return dragDropContext({
        onDragEnd: result => model.onDragEnd(result),
        item: droppable({
            droppableId: model.xhId,
            direction: isVertical ? 'vertical' : 'horizontal',
            children: provided =>
                div({
                    className: `xh-dynamic-tab-switcher__tabs xh-tab-switcher xh-tab-switcher--${props.orientation}`,
                    ref: composeRefs(provided.innerRef, ref),
                    item: div({
                        className: classNames('bp5-tabs', isVertical && 'bp5-vertical'),
                        item: div({
                            className: 'bp5-tab-list',
                            items: [
                                visibleTabs.map((tab, index) =>
                                    tabCmp({key: tab.id, localModel, tab, index})
                                ),
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
    localModel: DynamicTabSwitcherLocalModel;
}

const tabCmp = hoistCmp.factory<TabProps>(({tab, index, localModel, model}) => {
    const isActive = model.isTabActive(tab.id),
        isCloseable =
            tab.disabled ||
            model.enabledVisibleTabs.filter(it => it instanceof TabModel).length > 1,
        tabRef = useRef<HTMLDivElement>(),
        scrollerModel = useContextModel(ScrollerModel),
        {showScrollButtons} = scrollerModel,
        {disabled, icon, tooltip} = tab,
        isFavorite = model.isTabFavorite(tab.id),
        {isVertical, props} = localModel;

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
                onContextMenu: e => {
                    const domRect = e.currentTarget.getBoundingClientRect();
                    showContextMenu(
                        contextMenu({
                            menuItems: model.getContextMenuItems(e, tab)
                        }),
                        {
                            left: props.orientation === 'left' ? domRect.right : domRect.left,
                            top: props.orientation === 'top' ? domRect.bottom : domRect.top
                        }
                    );
                },
                ref: composeRefs(provided.innerRef, tabRef),
                ...provided.draggableProps,
                ...provided.dragHandleProps,
                style: getStyles(isVertical, provided.draggableProps.style),
                items: [
                    div({
                        'aria-selected': isActive,
                        'aria-disabled': disabled,
                        className: 'bp5-tab',
                        item: bpTooltip({
                            content: tooltip as ReactElement,
                            disabled: !tooltip,
                            hoverOpenDelay: 1000,
                            position: flipOrientation(props.orientation),
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

const getStyles = (isVertical: boolean, style: CSSProperties): CSSProperties => {
    const {transform} = style;
    if (!transform) return style;

    return {
        ...style,
        // Only drag in one axis
        transform: isVertical
            ? `translate(0, ${last(transform.split(','))}`
            : `${first(transform.split(','))}, 0)`
    };
};

function flipOrientation(orientation: Side) {
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
