/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {hoistCmp, XH} from '@xh/hoist/core';
import {ViewManagerModel, ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {Dictionary} from 'express-serve-static-core';
import {each, filter, groupBy, isEmpty, orderBy, some, startCase} from 'lodash';
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
    const {enableDefault, view, typeDisplayName, globalDisplayName} = model,
        ownedViews = groupBy(filter(model.ownedViews, 'isPinned'), 'group'),
        globalViews = groupBy(filter(model.globalViews, 'isPinned'), 'group'),
        sharedViews = groupBy(filter(model.sharedViews, 'isPinned'), 'owner'),
        pluralName = pluralize(startCase(typeDisplayName)),
        ret = [];

    // Main Views items by type
    if (!isEmpty(ownedViews)) {
        ret.push(
            menuDivider({title: `My ${pluralName}`}),
            ...getGroupedMenuItems(ownedViews, model)
        );
    }
    if (!isEmpty(globalViews)) {
        ret.push(
            menuDivider({title: `${startCase(globalDisplayName)}  ${pluralName}`}),
            ...getGroupedMenuItems(globalViews, model)
        );
    }
    if (!isEmpty(sharedViews)) {
        ret.push(
            menuDivider({title: `Shared ${pluralName}`}),
            ...getGroupedMenuItems(sharedViews, model)
        );
    }

    if (enableDefault) {
        ret.push(
            menuDivider({omit: isEmpty(ret)}),
            menuItem({
                className: 'xh-view-manager__menu-item',
                icon: view.isDefault ? Icon.check() : Icon.placeholder(),
                text: `Default ${startCase(typeDisplayName)}`,
                onClick: () => model.selectViewAsync(null).catchDefault()
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
        isValueDirty,
        typeDisplayName
    } = parent;

    const pluralName = pluralize(startCase(typeDisplayName));

    return [
        menuItem({
            icon: Icon.save(),
            text: 'Save',
            disabled: !isViewSavable || !isValueDirty,
            onClick: () => model.saveAsync()
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
            onClick: () => model.revertAsync()
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
            text: `Manage ${pluralName}...`,
            onClick: () => model.manageDialogModel.open()
        })
    ];
}

function getGroupedMenuItems(
    byGroup: Dictionary<ViewInfo[]>,
    model: ViewManagerModel
): ReactNode[] {
    // Create grouped tree...
    let nodes: (ViewInfo | {name: string; groupViews: ViewInfo[]; isSelected: boolean})[] = [],
        selectedToken = model.view.token;

    each(byGroup, (groupViews, name) => {
        if (name != 'null') {
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
        title = [],
        usingRouting = !!(XH.routerState && model.viewRouteParam);

    if (!view.isOwned && view.owner) title.push(view.owner);
    if (view.description) title.push(view.description);

    const href = usingRouting
        ? XH.router.buildUrl(XH.routerState.name, {
              ...XH.routerState.params,
              [model.viewRouteParam]: view.token
          })
        : undefined;

    return menuItem({
        className: 'xh-view-manager__menu-item',
        key: view.token,
        text: view.name,
        title: title.join(' | '),
        icon,
        href,
        onClick: e => {
            if (!usingRouting || (e.button === 0 && !e.ctrlKey && !e.metaKey)) {
                consumeEvent(e);
                model.selectViewAsync(view).catchDefault();
                return false;
            }

            return true;
        }
    });
}
