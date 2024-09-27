import {div, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {
    PersistenceManagerModel,
    PersistenceViewTree
} from '@xh/hoist/core/persist/persistenceManager';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {capitalize, isEmpty} from 'lodash';
import {ReactNode} from 'react';

export interface PersistenceMenuProps extends HoistProps<PersistenceManagerModel> {
    /**  */
    showSaveButton?: 'whenDirty' | 'always' | 'never';
    /**  */
    showPrivateViewsInSubMenu?: boolean;
    /**  */
    showSharedViewsInSubMenu?: boolean;
}

export const [PersistenceMenu, persistenceMenu] = hoistCmp.withFactory<PersistenceMenuProps>({
    displayName: 'PersistenceMenu',
    className: 'xh-persistence-manager__menu',
    model: uses(PersistenceManagerModel),

    render({
        model,
        showSaveButton = 'whenDirty',
        showPrivateViewsInSubMenu = false,
        showSharedViewsInSubMenu = false
    }: PersistenceMenuProps) {
        const {selectedView, isShared, entity} = model,
            displayName = entity.displayName;
        return hbox({
            className: 'xh-persistence-manager__menu',
            items: [
                popover({
                    item: button({
                        text:
                            model.getHierarchyDisplayName(selectedView?.name) ??
                            `Default ${capitalize(displayName)}`,
                        icon: isShared ? Icon.users() : Icon.bookmark(),
                        rightIcon: Icon.chevronDown(),
                        outlined: true
                    }),
                    content: div(
                        div({
                            className: 'xh-popup__title',
                            item: capitalize(pluralize(displayName))
                        }),
                        objMenu({showPrivateViewsInSubMenu, showSharedViewsInSubMenu})
                    ),
                    placement: 'bottom-start'
                }),
                persistenceSaveButton({
                    omit:
                        showSaveButton === 'never' ||
                        (showSaveButton === 'whenDirty' && !model.isDirty && !model.canSave) ||
                        (model.enableAutoSave && !model.canSave && model.isSharedViewSelected),
                    disabled: !model.canSave
                })
            ]
        });
    }
});

export const persistenceSaveButton = hoistCmp.factory<PersistenceManagerModel>({
    render({model, disabled}) {
        return button({
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.entity.displayName}`,
            intent: 'primary',
            disabled,
            onClick: () => model.saveAsync(false).linkTo(model.loadModel)
        });
    }
});

const menuFavorite = hoistCmp.factory<PersistenceManagerModel>({
    render({model, view}) {
        const isFavorite = model.isFavorite(view.token);
        return hbox({
            className: 'xh-persistence-manager__menu-item',
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: view.text}),
                filler(),
                div({
                    className: `xh-persistence-manager__menu-item--fav ${isFavorite ? 'xh-persistence-manager__menu-item--fav--active' : ''}`,
                    item: Icon.favorite({
                        prefix: isFavorite ? 'fas' : 'far'
                    }),
                    onClick: e => {
                        consumeEvent(e);
                        model.toggleFavorite(view.token);
                    }
                })
            ]
        });
    }
});

const objMenu = hoistCmp.factory<PersistenceMenuProps>({
    render({model, showPrivateViewsInSubMenu, showSharedViewsInSubMenu}) {
        const {entity} = model,
            items = [];

        if (!isEmpty(model.favoritedViews)) {
            items.push(menuDivider({title: 'Favorites'}));
            items.push(
                ...model.favoritedViews.map(it => {
                    return menuItem({
                        key: `${it.token}-isFavorite`,
                        icon: model.selectedToken === it.token ? Icon.check() : Icon.placeholder(),
                        text: menuFavorite({
                            view: {...it, text: model.getHierarchyDisplayName(it.name)}
                        }),
                        onClick: () => model.selectAsync(it.token).linkTo(model.loadModel)
                    });
                })
            );
        }
        if (!isEmpty(model.privateViewTree)) {
            items.push(
                menuDivider({
                    title: showPrivateViewsInSubMenu ? null : `My ${pluralize(entity.displayName)}`
                })
            );
            if (showPrivateViewsInSubMenu) {
                items.push(
                    menuItem({
                        text: `My ${pluralize(entity.displayName)}`,
                        shouldDismissPopover: false,
                        children: model.privateViewTree.map(it => {
                            return buildView(it, model);
                        })
                    })
                );
            } else {
                model.privateViewTree.forEach(it => {
                    items.push(buildView(it, model));
                });
            }
        }
        if (!isEmpty(model.sharedViewTree)) {
            items.push(
                menuDivider({
                    title: showSharedViewsInSubMenu
                        ? null
                        : `Shared ${pluralize(entity.displayName)}`
                })
            );
            if (showSharedViewsInSubMenu) {
                items.push(
                    menuItem({
                        text: `Shared ${pluralize(entity.displayName)}`,
                        shouldDismissPopover: false,
                        children: model.sharedViewTree.map(it => {
                            return buildView(it, model);
                        })
                    })
                );
            } else {
                model.sharedViewTree.forEach(it => {
                    items.push(buildView(it, model));
                });
            }
        }

        return menu({
            items: [
                ...items,
                menuDivider({omit: !model.enableDefault || isEmpty(items)}),
                menuItem({
                    icon: model.selectedToken ? Icon.placeholder() : Icon.check(),
                    text: `Default ${capitalize(entity.displayName)}`,
                    omit: !model.enableDefault,
                    onClick: () => model.selectAsync(null)
                }),
                menuDivider({omit: !model.enableDefault}),
                menuItem({
                    icon: Icon.save(),
                    text: 'Save',
                    disabled: !model.canSave,
                    onClick: () => model.saveAsync(false)
                }),
                menuItem({
                    icon: Icon.copy(),
                    text: 'Save as...',
                    onClick: () => model.saveAsAsync()
                }),
                menuItem({
                    icon: Icon.reset(),
                    text: `Revert ${capitalize(entity.displayName)}`,
                    disabled: !model.isDirty,
                    onClick: () => model.resetAsync()
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.gear(),
                    disabled: isEmpty(model.views),
                    text: `Manage ${pluralize(entity.displayName)}...`,
                    onClick: () => model.openManageDialog()
                })
            ]
        });
    }
});

function buildView(view: PersistenceViewTree, model: PersistenceManagerModel): ReactNode {
    const {type, text, selected} = view,
        icon = selected ? Icon.check() : Icon.placeholder();
    switch (type) {
        case 'directory':
            return menuItem({
                text,
                icon,
                shouldDismissPopover: false,
                children: view.items ? view.items.map(child => buildView(child, model)) : []
            });
        case 'view':
            return menuItem({
                className: 'xh-persistence-manager__menu-item',
                key: view.token,
                icon,
                text: menuFavorite({model, view}),
                onClick: () => model.selectAsync(view.token).linkTo(model.loadModel)
            });
    }
}
