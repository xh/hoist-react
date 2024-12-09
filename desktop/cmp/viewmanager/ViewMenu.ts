/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {box} from '@xh/hoist/cmp/layout';
import {spinner} from '@xh/hoist/cmp/spinner';
import {hoistCmp} from '@xh/hoist/core';
import {ViewManagerModel, ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {each, groupBy, isEmpty, orderBy, some, startCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewManagerLocalModel} from './ViewManagerLocalModel';

/**
 * Default Menu used by ViewManager.
 */
export const viewMenu = hoistCmp.factory<ViewManagerLocalModel>({
    render({model}) {
        return menu({
            className: 'xh-view-manager__menu',
            items: [...getNavMenuItems(model.parent), menuDivider(), ...getOtherMenuItems(model)]
        });
    }
});

function getNavMenuItems(model: ViewManagerModel): ReactNode[] {
    const {enableDefault, view, typeDisplayName, globalDisplayName, pinnedViews} = model,
        {owned, global, other} = groupBy(pinnedViews, v =>
            v.isOwned ? 'owned' : v.isGlobal ? 'global' : 'other'
        ),
        pluralName = pluralize(startCase(typeDisplayName)),
        ret = [];

    // Main Views items by type
    // TODO -- be smart?  If more than, say n for any cat, start nesting them in submenus?
    if (!isEmpty(owned)) {
        ret.push(menuDivider({title: `My  ${pluralName}`}), ...getGroupedMenuItems(owned, model));
    }
    if (!isEmpty(global)) {
        ret.push(
            menuDivider({title: `${startCase(globalDisplayName)}  ${pluralName}`}),
            ...getGroupedMenuItems(owned, model)
        );
    }
    if (!isEmpty(other)) {
        ret.push(
            menuDivider({title: `Other ${pluralName}`}),
            ...orderBy(
                other.map(v => viewMenuItem(v, model)),
                ['name', 'owner']
            )
        );
    }

    if (enableDefault) {
        ret.push(
            menuDivider({omit: isEmpty(ret)}),
            menuItem({
                className: 'xh-view-manager__menu-item',
                icon: view.isDefault ? Icon.check() : Icon.placeholder(),
                text: `Default ${startCase(typeDisplayName)}`,
                onClick: () => model.selectViewAsync(null)
            })
        );
    }

    return ret;
}

function getOtherMenuItems(model: ViewManagerLocalModel): ReactNode[] {
    const {parent} = model;
    const {
        enableAutoSave,
        autoSaveUnavailableReason,
        autoSave,
        isViewSavable,
        views,
        isValueDirty,
        loadModel,
        typeDisplayName
    } = parent;

    const pluralName = pluralize(startCase(typeDisplayName));

    return [
        menuItem({
            icon: Icon.save(),
            text: 'Save',
            disabled: !isViewSavable || !isValueDirty,
            onClick: () => parent.saveAsync()
        }),
        menuItem({
            icon: Icon.placeholder(),
            text: 'Save As...',
            onClick: () => model.saveAsDialogModel.open()
        }),
        menuItem({
            icon: Icon.reset(),
            text: `Revert`,
            disabled: !isValueDirty,
            onClick: () => parent.resetAsync()
        }),
        menuDivider({omit: !enableAutoSave}),
        menuItem({
            omit: !enableAutoSave,
            text: switchInput({
                label: 'Auto Save',
                value: !autoSaveUnavailableReason && autoSave,
                disabled: !!autoSaveUnavailableReason,
                onChange: v => (parent.autoSave = v),
                inline: true
            }),
            title: autoSaveUnavailableReason,
            shouldDismissPopover: false
        }),
        menuDivider(),
        menuItem({
            icon: Icon.gear(),
            disabled: isEmpty(views),
            text: `Manage ${pluralName}...`,
            onClick: () => model.manageDialogModel.open()
        }),
        menuItem({
            icon: !loadModel.isPending
                ? Icon.refresh()
                : box({
                      height: 20,
                      item: spinner({width: 16.25, height: 16.25})
                  }),
            disabled: loadModel.isPending,
            text: `Refresh ${pluralName}`,
            onClick: e => {
                // Ensure at least 100ms delay to render spinner
                Promise.all([wait(100), parent.refreshAsync()]).linkTo(loadModel);
                consumeEvent(e);
            }
        })
    ];
}

function getGroupedMenuItems(views: ViewInfo[], model: ViewManagerModel): ReactNode[] {
    // Create grouped tree...
    let nodes: (ViewInfo | {name: string; groupViews: ViewInfo[]; isSelected: boolean})[] = [],
        selectedToken = model.view.token,
        byGroup = groupBy(views, v => v.group ?? 'ungrouped');

    each(byGroup, (groupViews, name) => {
        if (name != 'ungrouped') {
            nodes.push({name, groupViews, isSelected: some(groupViews, {token: selectedToken})});
        } else {
            nodes.push(...groupViews);
        }
    });

    // ...sort groups first, then alpha by name. But could easily intersperse instead
    nodes = orderBy(nodes, [v => v instanceof ViewInfo, 'name']);

    return nodes.map(n => {
        return n instanceof ViewInfo
            ? viewMenuItem(n, model)
            : menuItem({
                  text: n.name,
                  icon: n.isSelected ? Icon.check() : Icon.placeholder(),
                  shouldDismissPopover: false,
                  items: n.groupViews.map(v => viewMenuItem(v, model))
              });
    });
}

function viewMenuItem(view: ViewInfo, model: ViewManagerModel): ReactNode {
    const icon = view.isCurrentView ? Icon.check() : Icon.placeholder(),
        title = [];

    if (view.isShared) title.push(view.owner);
    if (view.description) title.push(view.description);

    return menuItem({
        className: 'xh-view-manager__menu-item',
        key: view.token,
        text: view.name,
        title: title.join('|'),
        icon,
        onClick: () => model.selectViewAsync(view)
    });
}
