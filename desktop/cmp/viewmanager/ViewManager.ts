import {div, filler, fragment, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './ViewManager.scss';
import {ViewTree} from '@xh/hoist/core/persist/viewmanager';
import {ViewManagerModel} from '@xh/hoist/core/persist/viewmanager/ViewManagerModel';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {manageDialog} from './impl/ManageDialog';
import {saveDialog} from './impl/SaveDialog';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {isEmpty, startCase} from 'lodash';
import {ReactNode} from 'react';

/**
 * Visibility options for save/revert button.
 *
 * 'never' to hide button.
 * 'whenDirty' to only show when persistence state is dirty and button is therefore enabled.
 * 'always' will always show button.
 */
export type ViewManagerStateButtonMode = 'whenDirty' | 'always' | 'never';

export interface ViewManagerProps extends HoistProps<ViewManagerModel> {
    menuButtonProps?: Partial<ButtonProps>;
    saveButtonProps?: Partial<ButtonProps>;
    revertButtonProps?: Partial<ButtonProps>;

    /** Default 'whenDirty' */
    showSaveButton?: ViewManagerStateButtonMode;
    /** Default 'never' */
    showRevertButton?: ViewManagerStateButtonMode;

    /** Side the save and revert buttons should appear on (default 'right') */
    buttonSide?: 'left' | 'right';

    /** True to render private views in sub-menu (Default false)*/
    showPrivateViewsInSubMenu?: boolean;
    /** True to render global views in sub-menu (Default false)*/
    showGlobalViewsInSubMenu?: boolean;
}

/**
 * Desktop ViewManager component - a button-based menu for saving and swapping between named
 * bundles of persisted component state (eg grid views, dashboards, and similar).
 *
 * See {@link ViewManagerModel} for additional details and configuration options.
 */
export const [ViewManager, viewManager] = hoistCmp.withFactory<ViewManagerProps>({
    displayName: 'ViewManager',
    className: 'xh-view-manager',
    model: uses(ViewManagerModel),

    render({
        model,
        className,
        menuButtonProps,
        saveButtonProps,
        revertButtonProps,
        showSaveButton = 'whenDirty',
        showRevertButton = 'never',
        buttonSide = 'right',
        showPrivateViewsInSubMenu = false,
        showGlobalViewsInSubMenu = false
    }: ViewManagerProps) {
        const save = saveButton({mode: showSaveButton, ...saveButtonProps}),
            revert = revertButton({mode: showRevertButton, ...revertButtonProps}),
            menu = popover({
                item: menuButton(menuButtonProps),
                content: viewMenu({showPrivateViewsInSubMenu, showGlobalViewsInSubMenu}),
                placement: 'bottom-start',
                popoverClassName: 'xh-view-manager__popover'
            });
        return fragment(
            hbox({
                className,
                items: buttonSide == 'left' ? [revert, save, menu] : [menu, save, revert]
            }),
            manageDialog({
                omit: !model.manageDialogOpen,
                onClose: () => model.closeManageDialog()
            }),
            saveDialog()
        );
    }
});

const menuButton = hoistCmp.factory<ViewManagerModel>({
    render({model, ...rest}) {
        const {selectedView, typeDisplayName} = model;
        return button({
            className: 'xh-view-manager__menu-button',
            text: selectedView?.shortName ?? `Default ${startCase(typeDisplayName)}`,
            icon: Icon.bookmark(),
            rightIcon: Icon.chevronDown(),
            outlined: true,
            ...rest
        });
    }
});

const saveButton = hoistCmp.factory<ViewManagerModel>({
    render({model, mode, ...rest}) {
        if (hideStateButton(model, mode)) return null;
        return button({
            className: 'xh-view-manager__save-button',
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.typeDisplayName}`,
            intent: 'primary',
            disabled: !model.isDirty,
            onClick: () => {
                model.canSave ? model.saveAsync() : model.saveAsAsync();
            },
            ...rest
        });
    }
});

const revertButton = hoistCmp.factory<ViewManagerModel>({
    render({model, mode, ...rest}) {
        if (hideStateButton(model, mode)) return null;
        return button({
            className: 'xh-view-manager__revert-button',
            icon: Icon.reset(),
            tooltip: `Revert changes to this ${model.typeDisplayName}`,
            intent: 'danger',
            disabled: !model.isDirty,
            onClick: () => model.resetAsync(),
            ...rest
        });
    }
});

function hideStateButton(model: ViewManagerModel, mode: ViewManagerStateButtonMode): boolean {
    return mode === 'never' || (mode === 'whenDirty' && !model.isDirty);
}

const viewMenu = hoistCmp.factory<ViewManagerProps>({
    render({model, showPrivateViewsInSubMenu, showGlobalViewsInSubMenu}) {
        const {
            enableDefault,
            canSave,
            selectedToken,
            typeDisplayName,
            globalDisplayName,
            privateViewTree,
            globalViewTree,
            favoriteViews,
            views,
            isDirty
        } = model;

        const pluralName = pluralize(startCase(typeDisplayName)),
            myPluralName = `My  ${pluralName}`,
            globalPluralName = `${globalDisplayName}  ${pluralName}`,
            items = [];
        if (!isEmpty(favoriteViews)) {
            items.push(
                menuDivider({title: 'Favorites'}),
                ...favoriteViews.map(it => {
                    return menuItem({
                        key: `${it.token}-favorite`,
                        icon: model.selectedToken === it.token ? Icon.check() : Icon.placeholder(),
                        text: menuItemTextAndFaveToggle({
                            view: {...it, text: it.shortName}
                        }),
                        onClick: () => model.selectViewAsync(it.token),
                        title: it.description
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
                    icon: selectedToken ? Icon.placeholder() : Icon.check(),
                    text: `Default ${startCase(typeDisplayName)}`,
                    omit: !enableDefault,
                    onClick: () => model.selectViewAsync(null)
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.save(),
                    text: 'Save',
                    disabled: !canSave || !isDirty,
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
                    disabled: !isDirty,
                    onClick: () => model.resetAsync()
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.gear(),
                    disabled: isEmpty(views),
                    text: `Manage ${pluralName}...`,
                    onClick: () => model.openManageDialog()
                })
            ]
        });
    }
});

function buildMenuItem(viewOrFolder: ViewTree, model: ViewManagerModel): ReactNode {
    const {type, text, selected} = viewOrFolder,
        icon = selected ? Icon.check() : Icon.placeholder();

    switch (type) {
        case 'folder':
            return menuItem({
                text,
                icon,
                shouldDismissPopover: false,
                items: viewOrFolder.items
                    ? viewOrFolder.items.map(child => buildMenuItem(child, model))
                    : []
            });
        case 'view':
            return menuItem({
                className: 'xh-view-manager__menu-item',
                key: viewOrFolder.token,
                icon,
                text: menuItemTextAndFaveToggle({model, view: viewOrFolder}),
                title: viewOrFolder.description,
                onClick: () => model.selectViewAsync(viewOrFolder.token)
            });
    }
}

const menuItemTextAndFaveToggle = hoistCmp.factory<ViewManagerModel>({
    render({model, view}) {
        const isFavorite = model.isFavorite(view.token);
        return hbox({
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: view.text}),
                fragment({
                    omit: !model.enableFavorites,
                    items: [
                        filler(),
                        div({
                            className: `xh-view-manager__menu-item__fave-toggle ${isFavorite ? 'xh-view-manager__menu-item__fave-toggle--active' : ''}`,
                            item: Icon.favorite({prefix: isFavorite ? 'fas' : 'far'}),
                            onClick: e => {
                                consumeEvent(e);
                                model.toggleFavorite(view.token);
                            }
                        })
                    ]
                })
            ]
        });
    }
});
