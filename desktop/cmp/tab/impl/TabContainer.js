/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hbox, vbox, div, frame} from '@xh/hoist/cmp/layout';
import {getLayoutProps} from '@xh/hoist/utils/react';
import '../Tabs.scss';
import {tabSwitcher} from '../TabSwitcher';
import {tab} from './Tab';
import {isEmpty} from 'lodash';

/**
 * Desktop implementation of TabContainer.
 * @private
 */
export function tabContainerImpl({model, className, ...props}) {
    const {switcherPosition} = model,
        layoutProps = getLayoutProps(props),
        vertical = ['left', 'right'].includes(switcherPosition),
        container = vertical ? hbox : vbox;

    // Default flex = 'auto' if no dimensions / flex specified.
    if (layoutProps.width === null && layoutProps.height === null && layoutProps.flex === null) {
        layoutProps.flex = 'auto';
    }

    return container({
        ...layoutProps,
        className,
        item: getChildren(model)
    });
}

function getChildren(model) {
    const {tabs, activeTabId, switcherPosition: orientation, enableOverflow} = model,
        switcherBefore = ['left', 'top'].includes(orientation),
        switcherAfter = ['right', 'bottom'].includes(orientation);

    if (isEmpty(tabs)) {
        return div({
            className: 'xh-tab-wrapper',
            item: frame(
                div({
                    flex: 1,
                    className: 'xh-text-color-accent xh-pad xh-tab--empty',
                    item: model.emptyText
                })
            )
        });
    }

    return [
        switcherBefore ? tabSwitcher({key: 'switcher', orientation, enableOverflow}) : null,
        ...tabs.map(tabModel => {
            const tabId = tabModel.id,
                style = (activeTabId !== tabId) ? hideStyle : undefined;

            return div({
                className: 'xh-tab-wrapper',
                style,
                key: tabId,
                item: tab({model: tabModel})
            });
        }),
        switcherAfter ? tabSwitcher({key: 'switcher', orientation, enableOverflow}) : null
    ];
}

const hideStyle = {display: 'none'};

