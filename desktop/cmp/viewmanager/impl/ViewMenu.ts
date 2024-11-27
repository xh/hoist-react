/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {div, filler, fragment, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {ViewTree, ViewManagerModel, ViewInfo} from '@xh/hoist/core/persist/viewmanager';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {isEmpty, startCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewManagerProps} from '../ViewManager';

/**
 * @internal
 */
export const viewMenu = hoistCmp.factory<ViewManagerProps>({
    render({model, showPrivateViewsInSubMenu, showGlobalViewsInSubMenu}) {
        const {
            enableDefault,
            isViewSavable,
            view,
            typeDisplayName,
            globalDisplayName,
            privateViewTree,
            globalViewTree,
            favoriteViews,
            views,
            isValueDirty
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

        if (!isEmpty(privateViewTree)) {
            if (showPrivateViewsInSubMenu) {
                items.push(
                    menuDivider({omit: isEmpty(items)}),
                    menuItem({
                        text: myPluralName,
                        shouldDismissPopover: false,
                        items: privateViewTree.map(it => buildMenuItem(it, model))
                    })
                );
            } else {
                items.push(
                    menuDivider({title: myPluralName}),
                    ...privateViewTree.map(it => buildMenuItem(it, model))
                );
            }
        }

        if (!isEmpty(globalViewTree)) {
            if (showGlobalViewsInSubMenu) {
                items.push(
                    menuDivider({omit: isEmpty(items)}),
                    menuItem({
                        text: globalPluralName,
                        shouldDismissPopover: false,
                        items: globalViewTree.map(it => buildMenuItem(it, model))
                    })
                );
            } else {
                items.push(
                    menuDivider({title: globalPluralName}),
                    ...globalViewTree.map(it => buildMenuItem(it, model))
                );
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

function buildMenuItem(node: ViewTree, model: ViewManagerModel): ReactNode {
    const {selected, data} = node,
        icon = selected ? Icon.check() : Icon.placeholder();

    return data instanceof ViewInfo
        ? menuItem({
              className: 'xh-view-manager__menu-item',
              key: data.token,
              icon,
              text: textAndFaveToggle({info: data}),
              title: data.description,
              onClick: () => model.selectViewAsync(data)
          })
        : menuItem({
              icon,
              text: data.folderName,
              shouldDismissPopover: false,
              items: data.children.map(child => buildMenuItem(child, model))
          });
}

const textAndFaveToggle = hoistCmp.factory<ViewManagerModel>({
    render({model, info}) {
        const {isFavorite, shortDisplayName} = info;
        return hbox({
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: shortDisplayName}),
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
