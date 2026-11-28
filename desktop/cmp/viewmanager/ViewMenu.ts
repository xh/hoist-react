/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp, type MenuItem, type MenuItemLike} from '@xh/hoist/core';
import type {ViewGroupNode, ViewManagerModel, ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {buildViewGroupTree} from '@xh/hoist/cmp/viewmanager';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {menu} from '@xh/hoist/desktop/cmp/menu';
import {Icon} from '@xh/hoist/icon';
import {getTestId, pluralize} from '@xh/hoist/utils/js';
import {filter, groupBy, isEmpty, isFunction, keys, some, startCase} from 'lodash';
import type {ViewManagerLocalModel} from './ViewManagerLocalModel';

/**
 * Default Menu used by ViewManager.
 */
export const viewMenu = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, extraMenuItems, testId}) {
        return menu({
            className: 'xh-view-manager__menu',
            testId,
            menuItems: [
                ...getNavMenuItems(model.parent, testId),
                '-',
                ...(extraMenuItems ?? []),
                '-',
                ...getOtherMenuItems(model, testId)
            ]
        });
    }
});

function getNavMenuItems(model: ViewManagerModel, testId: string): MenuItemLike[] {
    const {enableDefault, view, defaultDisplayName, typeDisplayName, globalDisplayName} = model,
        ownedViews = filter(model.ownedViews, 'isPinned'),
        globalViews = filter(model.globalViews, 'isPinned'),
        sharedViews = groupBy(filter(model.sharedViews, 'isPinned'), 'owner'),
        pluralName = pluralize(startCase(typeDisplayName)),
        ret: MenuItemLike[] = [];

    // Main Views items by type
    if (!isEmpty(ownedViews)) {
        ret.push({heading: `My ${pluralName}`}, ...getGroupedMenuItems(ownedViews, model, testId));
    }
    if (!isEmpty(globalViews)) {
        ret.push(
            {heading: `${startCase(globalDisplayName)}  ${pluralName}`},
            ...getGroupedMenuItems(globalViews, model, testId)
        );
    }
    if (!isEmpty(sharedViews)) {
        ret.push(
            {heading: `Shared ${pluralName}`},
            // One submenu per owner, each nesting that owner's views by group within.
            ...keys(sharedViews)
                .sort((a, b) => a.localeCompare(b))
                .map(owner => ({
                    text: owner,
                    icon: some(sharedViews[owner], 'isCurrentView')
                        ? Icon.check()
                        : Icon.placeholder(),
                    items: getGroupedMenuItems(sharedViews[owner], model, testId)
                }))
        );
    }

    if (enableDefault) {
        ret.push('-', {
            className: 'xh-view-manager__menu-item',
            icon: view.isDefault ? Icon.check() : Icon.placeholder(),
            text: `${startCase(defaultDisplayName)} ${startCase(typeDisplayName)}`,
            testId: getTestId(testId, 'view-default'),
            actionFn: () => model.selectViewAsync(null).catchDefault()
        });
    }

    return ret;
}

function getOtherMenuItems(model: ViewManagerLocalModel, testId: string): MenuItemLike[] {
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
        {
            icon: Icon.save(),
            text: 'Save',
            testId: getTestId(testId, 'save'),
            disabled: !isViewSavable || !isValueDirty,
            actionFn: () => model.saveAsync()
        },
        {
            icon: Icon.placeholder(),
            text: 'Save As...',
            testId: getTestId(testId, 'save-as'),
            actionFn: () => model.saveAsDialogModel.open()
        },
        {
            icon: Icon.reset(),
            text: `Revert`,
            testId: getTestId(testId, 'revert'),
            disabled: !isValueDirty,
            actionFn: () => model.revertAsync()
        },
        ...(enableAutoSave
            ? [
                  '-' as const,
                  {
                      text: span({
                          title: autoSaveUnavailableReason,
                          children: switchInput({
                              label: 'Auto Save',
                              value: !autoSaveUnavailableReason && autoSave,
                              disabled: !!autoSaveUnavailableReason,
                              onChange: v => (parent.autoSave = v),
                              inline: true,
                              testId: getTestId(testId, 'auto-save')
                          })
                      }),
                      keepMenuOpen: true
                  }
              ]
            : []),
        '-',
        {
            icon: Icon.gear(),
            text: `Manage ${pluralName}...`,
            testId: getTestId(testId, 'manage'),
            actionFn: () => model.manageDialogModel.open()
        }
    ];
}

function getGroupedMenuItems(
    views: ViewInfo[],
    model: ViewManagerModel,
    testId: string
): MenuItemLike[] {
    // Groups (nested to any depth via slash-delimited group names) first, then loose views,
    // alpha by name at every level. But could easily intersperse instead.
    const {roots, ungrouped} = buildViewGroupTree(views);
    return [
        ...roots.map(node => groupMenuItem(node, model, testId)),
        ...ungrouped.map(v => viewMenuItem(v, model, testId))
    ];
}

function groupMenuItem(node: ViewGroupNode, model: ViewManagerModel, testId: string): MenuItem {
    return {
        text: node.name,
        icon: containsSelected(node, model) ? Icon.check() : Icon.placeholder(),
        items: [
            ...node.children.map(child => groupMenuItem(child, model, testId)),
            ...node.views.map(v => viewMenuItem(v, model, testId))
        ]
    };
}

function containsSelected(node: ViewGroupNode, model: ViewManagerModel): boolean {
    return (
        some(node.views, {token: model.view.token}) ||
        some(node.children, child => containsSelected(child, model))
    );
}

function viewMenuItem(view: ViewInfo, model: ViewManagerModel, testId: string): MenuItemLike {
    if (isFunction(model.viewMenuItemFn)) {
        return model.viewMenuItemFn(view, model) as MenuItemLike;
    }

    const title = [];
    if (!view.isOwned && view.owner) title.push(view.owner);
    if (view.description) title.push(view.description);

    return {
        className: 'xh-view-manager__menu-item',
        text: span({title: title.join(' | ') || undefined, children: view.name}),
        testId: getTestId(testId, `view-${view.token}`),
        icon: view.isCurrentView ? Icon.check() : Icon.placeholder(),
        actionFn: () => model.selectViewAsync(view).catchDefault()
    };
}
