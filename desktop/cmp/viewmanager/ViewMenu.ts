/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {
    buildViewGroupTree,
    ViewGroupNode,
    ViewManagerModel,
    ViewInfo
} from '@xh/hoist/cmp/viewmanager';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {getTestId, pluralize, TEST_ID} from '@xh/hoist/utils/js';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/menu/impl/MenuItems';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {filter, groupBy, isEmpty, isFunction, keys, some, startCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewManagerLocalModel} from './ViewManagerLocalModel';

/**
 * Default Menu used by ViewManager.
 */
export const viewMenu = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, extraMenuItems, testId}) {
        return menu({
            className: 'xh-view-manager__menu',
            [TEST_ID]: testId,
            items: [
                ...getNavMenuItems(model.parent, testId),
                menuDivider(),
                ...parseMenuItems(extraMenuItems),
                menuDivider(),
                ...getOtherMenuItems(model, testId)
            ].filter(filterConsecutiveMenuSeparators())
        });
    }
});

function getNavMenuItems(model: ViewManagerModel, testId: string): ReactNode[] {
    const {enableDefault, view, defaultDisplayName, typeDisplayName, globalDisplayName} = model,
        ownedViews = filter(model.ownedViews, 'isPinned'),
        globalViews = filter(model.globalViews, 'isPinned'),
        sharedViews = groupBy(filter(model.sharedViews, 'isPinned'), 'owner'),
        pluralName = pluralize(startCase(typeDisplayName)),
        ret = [];

    // Main Views items by type
    if (!isEmpty(ownedViews)) {
        ret.push(
            menuDivider({title: `My ${pluralName}`}),
            ...getGroupedMenuItems(ownedViews, model, testId)
        );
    }
    if (!isEmpty(globalViews)) {
        ret.push(
            menuDivider({title: `${startCase(globalDisplayName)}  ${pluralName}`}),
            ...getGroupedMenuItems(globalViews, model, testId)
        );
    }
    if (!isEmpty(sharedViews)) {
        ret.push(
            menuDivider({title: `Shared ${pluralName}`}),
            // One submenu per owner, each nesting that owner's views by group within.
            ...keys(sharedViews)
                .sort((a, b) => a.localeCompare(b))
                .map(owner =>
                    menuItem({
                        text: owner,
                        icon: some(sharedViews[owner], 'isCurrentView')
                            ? Icon.check()
                            : Icon.placeholder(),
                        shouldDismissPopover: false,
                        items: getGroupedMenuItems(sharedViews[owner], model, testId)
                    })
                )
        );
    }

    if (enableDefault) {
        ret.push(
            menuDivider({omit: isEmpty(ret)}),
            menuItem({
                className: 'xh-view-manager__menu-item',
                icon: view.isDefault ? Icon.check() : Icon.placeholder(),
                text: `${startCase(defaultDisplayName)} ${startCase(typeDisplayName)}`,
                [TEST_ID]: getTestId(testId, 'view-default'),
                onClick: () => model.selectViewAsync(null).catchDefault()
            })
        );
    }

    return ret;
}

function getOtherMenuItems(model: ViewManagerLocalModel, testId: string): ReactNode[] {
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
            [TEST_ID]: getTestId(testId, 'save'),
            disabled: !isViewSavable || !isValueDirty,
            onClick: () => model.saveAsync()
        }),
        menuItem({
            icon: Icon.placeholder(),
            text: 'Save As...',
            [TEST_ID]: getTestId(testId, 'save-as'),
            onClick: () => model.saveAsDialogModel.open()
        }),
        menuItem({
            icon: Icon.reset(),
            text: `Revert`,
            [TEST_ID]: getTestId(testId, 'revert'),
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
                inline: true,
                testId: getTestId(testId, 'auto-save')
            }),
            title: autoSaveUnavailableReason,
            shouldDismissPopover: false
        }),
        menuDivider(),
        menuItem({
            icon: Icon.gear(),
            text: `Manage ${pluralName}...`,
            [TEST_ID]: getTestId(testId, 'manage'),
            onClick: () => model.manageDialogModel.open()
        })
    ];
}

function getGroupedMenuItems(
    views: ViewInfo[],
    model: ViewManagerModel,
    testId: string
): ReactNode[] {
    // Groups (nested to any depth via slash-delimited group names) first, then loose views,
    // alpha by name at every level. But could easily intersperse instead.
    const {roots, ungrouped} = buildViewGroupTree(views);
    return [
        ...roots.map(node => groupMenuItem(node, model, testId)),
        ...ungrouped.map(v => viewMenuItem(v, model, testId))
    ];
}

function groupMenuItem(node: ViewGroupNode, model: ViewManagerModel, testId: string): ReactNode {
    return menuItem({
        text: node.name,
        icon: containsSelected(node, model) ? Icon.check() : Icon.placeholder(),
        shouldDismissPopover: false,
        items: [
            ...node.children.map(child => groupMenuItem(child, model, testId)),
            ...node.views.map(v => viewMenuItem(v, model, testId))
        ]
    });
}

function containsSelected(node: ViewGroupNode, model: ViewManagerModel): boolean {
    return (
        some(node.views, {token: model.view.token}) ||
        some(node.children, child => containsSelected(child, model))
    );
}

function viewMenuItem(view: ViewInfo, model: ViewManagerModel, testId: string): ReactNode {
    const icon = view.isCurrentView ? Icon.check() : Icon.placeholder(),
        title = [];

    if (!view.isOwned && view.owner) title.push(view.owner);
    if (view.description) title.push(view.description);

    return isFunction(model.viewMenuItemFn)
        ? model.viewMenuItemFn(view, model)
        : menuItem({
              className: 'xh-view-manager__menu-item',
              key: view.token,
              text: view.name,
              [TEST_ID]: getTestId(testId, `view-${view.token}`),
              title: title.join(' | '),
              icon,
              onClick: () => model.selectViewAsync(view).catchDefault()
          });
}
