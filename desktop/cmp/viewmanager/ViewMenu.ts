/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {div, filler, fragment, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {ViewManagerModel, ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {isEmpty, startCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewManagerProps} from './ViewManager';

/**
 * Default Menu used by ViewManager.
 */
export const viewMenu = hoistCmp.factory<ViewManagerProps>({
    render({model, showPrivateViewsInSubMenu, showGlobalViewsInSubMenu}) {
        const {
            enableAutoSave,
            autoSaveUnavailableReason,
            autoSave,
            enableDefault,
            isViewSavable,
            view,
            typeDisplayName,
            globalDisplayName,
            favoriteViews,
            views,
            isValueDirty,
            privateViews,
            globalViews
        } = model;

        const pluralName = pluralize(startCase(typeDisplayName)),
            myPluralName = `My  ${pluralName}`,
            globalPluralName = `${startCase(globalDisplayName)}  ${pluralName}`,
            items = [];
        if (!isEmpty(favoriteViews)) {
            items.push(
                menuDivider({title: 'Favorites'}),
                ...favoriteViews.map(info => {
                    return menuItem({
                        key: `${info.token}-favorite`,
                        icon: view.info?.token === info.token ? Icon.check() : Icon.placeholder(),
                        text: textAndFaveToggle({info}),
                        onClick: () => model.selectViewAsync(info),
                        title: info.description
                    });
                })
            );
        }

        if (!isEmpty(privateViews)) {
            const privateItems = privateViews.map(it => buildMenuItem(it, model));
            if (showPrivateViewsInSubMenu) {
                items.push(
                    menuDivider({omit: isEmpty(items)}),
                    menuItem({
                        text: myPluralName,
                        shouldDismissPopover: false,
                        items: privateItems
                    })
                );
            } else {
                items.push(menuDivider({title: myPluralName}), ...privateItems);
            }
        }

        if (!isEmpty(globalViews)) {
            const globalItems = globalViews.map(it => buildMenuItem(it, model));
            if (showGlobalViewsInSubMenu) {
                items.push(
                    menuDivider({omit: isEmpty(items)}),
                    menuItem({
                        text: globalPluralName,
                        shouldDismissPopover: false,
                        items: globalItems
                    })
                );
            } else {
                items.push(menuDivider({title: globalPluralName}), ...globalItems);
            }
        }

        return menu({
            className: 'xh-view-manager__menu',
            items: [
                ...items,
                menuDivider({omit: !enableDefault || isEmpty(items)}),
                menuItem({
                    icon: view.isDefault ? Icon.check() : Icon.placeholder(),
                    text: `Default ${startCase(typeDisplayName)}`,
                    omit: !enableDefault,
                    onClick: () => model.selectViewAsync(null)
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.save(),
                    text: 'Save',
                    disabled: !isViewSavable || !isValueDirty,
                    onClick: () => model.saveAsync()
                }),
                menuItem({
                    icon: Icon.placeholder(),
                    text: 'Save As...',
                    onClick: () => model.saveAsAsync()
                }),
                menuItem({
                    icon: Icon.reset(),
                    text: `Revert`,
                    disabled: !isValueDirty,
                    onClick: () => model.resetAsync()
                }),
                menuDivider({omit: !enableAutoSave}),
                menuItem({
                    omit: !enableAutoSave,
                    text: switchInput({
                        label: 'Auto Save',
                        value: !autoSaveUnavailableReason && autoSave,
                        disabled: !!autoSaveUnavailableReason,
                        onChange: v => (model.autoSave = v),
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
                    onClick: () => model.openManageDialog()
                }),
                menuItem({
                    icon: Icon.refresh(),
                    text: `Refresh ${pluralName}`,
                    onClick: e => {
                        model.refreshAsync();
                        consumeEvent(e);
                    }
                })
            ]
        });
    }
});

function buildMenuItem(data: ViewInfo, model: ViewManagerModel): ReactNode {
    const selected = data.token === model.view.token,
        icon = selected ? Icon.check() : Icon.placeholder();

    return menuItem({
        className: 'xh-view-manager__menu-item',
        key: data.token,
        icon,
        text: textAndFaveToggle({info: data}),
        title: data.description,
        onClick: () => model.selectViewAsync(data)
    });
}

const textAndFaveToggle = hoistCmp.factory<ViewManagerModel>({
    render({model, info}) {
        const {isFavorite, name} = info;
        return hbox({
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: name}),
                fragment({
                    omit: !model.enableFavorites,
                    items: [
                        filler(),
                        div({
                            className: `xh-view-manager__menu-item__fave-toggle ${isFavorite ? 'xh-view-manager__menu-item__fave-toggle--active' : ''}`,
                            item: Icon.favorite({prefix: isFavorite ? 'fas' : 'far'}),
                            onClick: e => {
                                consumeEvent(e);
                                model.toggleFavorite(info.token);
                            }
                        })
                    ]
                })
            ]
        });
    }
});
