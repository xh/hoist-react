import {div, filler, fragment, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './ViewManager.scss';
import {ViewTree} from '@xh/hoist/core/persist/viewmanager';
import {ViewManagerModel} from '@xh/hoist/core/persist/viewmanager/ViewManagerModel';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {manageDialog} from './impl/ManageDialog';
import {saveDialog} from './impl/SaveDialog';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {ReactNode} from 'react';

export interface ViewManagerProps extends HoistProps<ViewManagerModel> {
    menuButtonProps?: Partial<ButtonProps>;
    saveButtonProps?: Partial<ButtonProps>;
    /** 'whenDirty' to only show saveButton when persistence state is dirty. (Default 'whenDirty') */
    showSaveButton?: 'whenDirty' | 'always' | 'never';
    /** True to render private views in sub-menu (Default false)*/
    showPrivateViewsInSubMenu?: boolean;
    /** True to render shared views in sub-menu (Default false)*/
    showSharedViewsInSubMenu?: boolean;
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
        showSaveButton = 'whenDirty',
        showPrivateViewsInSubMenu = false,
        showSharedViewsInSubMenu = false
    }: ViewManagerProps) {
        return fragment(
            hbox({
                className,
                items: [
                    popover({
                        item: menuButton(menuButtonProps),
                        content: viewMenu({showPrivateViewsInSubMenu, showSharedViewsInSubMenu}),
                        placement: 'bottom-start',
                        popoverClassName: 'xh-view-manager__popover'
                    }),
                    saveButton({
                        showSaveButton,
                        ...saveButtonProps
                    })
                ]
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
        const {selectedView, DisplayName} = model;
        return button({
            className: 'xh-view-manager__menu-button',
            text: selectedView?.shortName ?? `Default ${DisplayName}`,
            icon: Icon.bookmark(),
            rightIcon: Icon.chevronDown(),
            outlined: true,
            ...rest
        });
    }
});

const saveButton = hoistCmp.factory<ViewManagerModel>({
    render({model, showSaveButton, ...rest}) {
        if (
            showSaveButton === 'never' ||
            (showSaveButton === 'whenDirty' && !model.isDirty) ||
            model.canAutoSave
        ) {
            return null;
        }

        return button({
            className: 'xh-view-manager__save-button',
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.displayName}`,
            intent: 'primary',
            disabled: !model.isDirty,
            onClick: () => {
                model.canSave ? model.saveAsync() : model.saveAsAsync();
            },
            ...rest
        });
    }
});

const viewMenu = hoistCmp.factory<ViewManagerProps>({
    render({model, showPrivateViewsInSubMenu, showSharedViewsInSubMenu}) {
        const {
            autoSaveUnavailableReason,
            enableDefault,
            canSave,
            selectedToken,
            enableAutoSave,
            DisplayName,
            autoSave,
            privateViewTree,
            sharedViewTree,
            favoriteViews,
            views,
            isDirty
        } = model;

        const pluralDisp = pluralize(DisplayName),
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
                        text: `My ${pluralDisp}`,
                        shouldDismissPopover: false,
                        children: privateViewTree.map(it => buildMenuItem(it, model))
                    })
                );
            } else {
                items.push(
                    menuDivider({title: `My ${pluralDisp}`}),
                    ...privateViewTree.map(it => buildMenuItem(it, model))
                );
            }
        }

        if (!isEmpty(sharedViewTree)) {
            if (showSharedViewsInSubMenu) {
                items.push(
                    menuDivider({omit: isEmpty(items)}),
                    menuItem({
                        text: `Shared ${pluralDisp}`,
                        shouldDismissPopover: false,
                        children: sharedViewTree.map(it => buildMenuItem(it, model))
                    })
                );
            } else {
                items.push(
                    menuDivider({title: `Shared ${pluralDisp}`}),
                    ...sharedViewTree.map(it => buildMenuItem(it, model))
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
                    text: `Default ${DisplayName}`,
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
                    icon: Icon.copy(),
                    text: 'Save As...',
                    onClick: () => model.saveAsAsync()
                }),
                menuItem({
                    icon: Icon.reset(),
                    text: `Revert`,
                    disabled: !isDirty,
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
                    text: `Manage ${pluralDisp}...`,
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
                children: viewOrFolder.items
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
