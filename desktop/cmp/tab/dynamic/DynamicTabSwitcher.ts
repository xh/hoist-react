import composeRefs from '@seznam/compose-react-refs';
import {div, hframe, span} from '@xh/hoist/cmp/layout';
import {HoistProps, hoistCmp, uses, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {hScroller} from '@xh/hoist/desktop/cmp/tab/dynamic/hscroller/HScroller';
import {HScrollerModel} from '@xh/hoist/desktop/cmp/tab/dynamic/hscroller/HScrollerModel';
import {popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {consumeEvent} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {first, isEmpty} from 'lodash';
import {CSSProperties, Ref, useEffect, useRef} from 'react';
import {DynamicTabSwitcherModel} from './DynamicTabSwitcherModel';
import {Icon} from '@xh/hoist/icon';
import {TabModel} from '@xh/hoist/cmp/tab';
import {wait} from '@xh/hoist/promise';
import './DynamicTabSwitcher.scss';

/**
 * A tab switcher that displays tabs as draggable items in a horizontal list.
 * Tabs can be added, removed, and reordered. All actions can be persisted.
 */

export const [DynamicTabSwitcher, dynamicTabSwitcher] = hoistCmp.withFactory({
    className: 'xh-dynamic-tab-switcher',
    displayName: 'DynamicTabSwitcher',
    model: uses(DynamicTabSwitcherModel),
    render({className}) {
        return hframe({
            className,
            items: [hScroller({content: tabs}), addButton()]
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
            item: provided =>
                div({
                    className: 'xh-dynamic-tab-switcher__tabs xh-tab-switcher xh-tab-switcher--top',
                    ref: composeRefs(provided.innerRef, ref),
                    item: div({
                        className: 'bp5-tabs',
                        item: div({
                            className: 'bp5-tab-list',
                            items: [
                                visibleTabs.map((tabModel, index) =>
                                    tab({key: tabModel.id, tabModel, index})
                                ),
                                provided.placeholder
                            ]
                        })
                    })
                })
        })
    });
});

const addButton = hoistCmp.factory<DynamicTabSwitcherModel>(({model}) => {
    const {hiddenTabs} = model;
    if (isEmpty(hiddenTabs)) return null;
    return popover({
        interactionKind: 'click',
        content: contextMenu({
            menuItems: [...model.hiddenTabActions(), '-', model.resetDefaultAction()]
        }),
        item: button({icon: Icon.add()})
    });
});

interface TabProps extends HoistProps<DynamicTabSwitcherModel> {
    tabModel: TabModel;
    index: number;
}

const tab = hoistCmp.factory<TabProps>(({tabModel, index, model}) => {
    const isActive = model.activeTab === tabModel,
        isCloseable = model.visibleTabs.length > 1,
        tabRef = useRef<HTMLDivElement>(),
        scrollerModel = useContextModel(HScrollerModel),
        {showScrollButtons} = scrollerModel;

    // Handle this at the component level rather than in the model since they are not "linked"
    useEffect(() => {
        if (isActive && showScrollButtons) {
            // Wait a tick for scroll buttons to render, then scroll to the active tab
            wait().then(() => tabRef.current.scrollIntoView({behavior: 'smooth'}));
        }
    }, [isActive, showScrollButtons]);

    return draggable({
        key: tabModel.id,
        draggableId: tabModel.id,
        index,
        item: (provided, snapshot) =>
            hframe({
                className: classNames(
                    'xh-dynamic-tab-switcher__tabs__tab',
                    isActive && 'xh-dynamic-tab-switcher__tabs__tab--active',
                    snapshot.isDragging && 'xh-dynamic-tab-switcher__tabs__tab--dragging'
                ),
                onClick: () => model.activate(tabModel),
                onContextMenu: e => model.onContextMenu(e, tabModel),
                ref: composeRefs(provided.innerRef, tabRef),
                ...provided.draggableProps,
                ...provided.dragHandleProps,
                style: getStyles(provided.draggableProps.style),
                items: [
                    div({
                        'aria-selected': isActive,
                        className: 'bp5-tab',
                        item: span({
                            className: 'bp5-popover-target',
                            item: hframe({
                                className: 'xh-tab-switcher__tab',
                                tabIndex: -1,
                                item: tabModel.title
                            })
                        })
                    }),
                    button({
                        className: 'xh-dynamic-tab-switcher__tabs__tab__close-button',
                        icon: Icon.x(),
                        minimal: true,
                        onClick: e => {
                            consumeEvent(e);
                            model.hide(tabModel.id);
                        },
                        omit: !isCloseable
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
