import {div, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {ViewManagerModel, ViewTree} from '@xh/hoist/core/persist/viewmanager';
import {button} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {capitalize, isEmpty} from 'lodash';
import {ReactNode} from 'react';

export interface ViewMenuProps extends HoistProps<ViewManagerModel> {
    /** 'whenDirty' to only show saveButton when persistence state is dirty. (Default 'whenDirty') */
    showSaveButton?: 'whenDirty' | 'always' | 'never';
    /** True to render private views in sub-menu (Default false)*/
    showPrivateViewsInSubMenu?: boolean;
    /** True to render shared views in sub-menu (Default false)*/
    showSharedViewsInSubMenu?: boolean;
}

export const [ViewMenu, viewMenu] = hoistCmp.withFactory<ViewMenuProps>({
    displayName: 'ViewMenu',
    className: 'xh-view-manager__menu',
    model: uses(ViewManagerModel),

    render({
        model,
        className,
        showSaveButton = 'whenDirty',
        showPrivateViewsInSubMenu = false,
        showSharedViewsInSubMenu = false
    }: ViewMenuProps) {
        const {selectedView, isShared, entity} = model,
            displayName = entity.displayName;

        return hbox({
            className,
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
                    content: objMenu({showPrivateViewsInSubMenu, showSharedViewsInSubMenu}),
                    placement: 'bottom-start'
                }),
                persistenceSaveButton({
                    omit:
                        showSaveButton === 'never' ||
                        (showSaveButton === 'whenDirty' && !model.isDirty) ||
                        !model.canSave ||
                        (model.enableAutoSave &&
                            model.autoSaveToggle &&
                            !model.canSave &&
                            model.isSharedViewSelected),
                    disabled: !model.canSave
                })
            ]
        });
    }
});

export const persistenceSaveButton = hoistCmp.factory<ViewManagerModel>({
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

const menuFavorite = hoistCmp.factory<ViewManagerModel>({
    render({model, view}) {
        const isFavorite = model.isFavorite(view.token);
        return hbox({
            className: 'xh-view-manager__menu-item',
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: view.text}),
                filler(),
                div({
                    className: `xh-view-manager__menu-item--fav ${isFavorite ? 'xh-view-manager__menu-item--fav--active' : ''}`,
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

const objMenu = hoistCmp.factory<ViewMenuProps>({
    render({model, showPrivateViewsInSubMenu, showSharedViewsInSubMenu}) {
        const {entity} = model,
            items = [];

        if (!isEmpty(model.favoriteViews)) {
            items.push(menuDivider({title: 'Favorites'}));
            items.push(
                ...model.favoriteViews.map(it => {
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
                    text: switchInput({
                        label: 'Auto Save',
                        bind: 'autoSaveToggle',
                        inline: true
                    }),
                    shouldDismissPopover: false
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

function buildView(view: ViewTree, model: ViewManagerModel): ReactNode {
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
                className: 'xh-view-manager__menu-item',
                key: view.token,
                icon,
                text: menuFavorite({model, view}),
                onClick: () => model.selectAsync(view.token).linkTo(model.loadModel)
            });
    }
}
