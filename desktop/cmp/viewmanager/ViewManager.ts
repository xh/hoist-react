/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {box, fragment, hbox} from '@xh/hoist/cmp/layout';
import {spinner} from '@xh/hoist/cmp/spinner';
import {hoistCmp, HoistProps, useLocalModel, uses} from '@xh/hoist/core';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {useOnVisibleChange} from '@xh/hoist/utils/react';
import {startCase} from 'lodash';
import {ReactElement} from 'react';
import {viewMenu} from './ViewMenu';
import {ViewManagerLocalModel} from './ViewManagerLocalModel';
import {manageDialog} from './dialog/ManageDialog';
import {saveAsDialog} from './dialog/SaveAsDialog';

import './ViewManager.scss';

export interface ViewManagerProps extends HoistProps<ViewManagerModel> {
    menuButtonProps?: Partial<ButtonProps>;
    saveButtonProps?: Partial<ButtonProps>;
    revertButtonProps?: Partial<ButtonProps>;

    /** Button icon when on the default (in-code state) view. Default `Icon.bookmark`. */
    defaultViewIcon?: ReactElement;
    /** Button icon when the selected view is owned by the current user. Default `Icon.bookmark`. */
    ownedViewIcon?: ReactElement;
    /** Button icon when the selected view is shared by another user. Default `Icon.users`. */
    sharedViewIcon?: ReactElement;
    /** Button icon when the selected view is globally shared. Default `Icon.globe`. */
    globalViewIcon?: ReactElement;

    /** Default 'whenDirty' */
    showSaveButton?: ViewManagerStateButtonMode;
    /** Default 'never' */
    showRevertButton?: ViewManagerStateButtonMode;
    /** Side relative to the menu on which save/revert buttons should render. Default 'right'. */
    buttonSide?: 'left' | 'right';
}

/**
 * Visibility options for save/revert buttons inlined next to the ViewManager menu:
 *      'never' to always hide - user must save/revert via menu.
 *      'whenDirty' (default) to show only when view state is dirty and the button is enabled.
 *      'always' to always show, including when view not dirty and the button is disabled.
 *          Useful to avoid jumpiness in toolbar layouts.
 */
export type ViewManagerStateButtonMode = 'whenDirty' | 'always' | 'never';

/**
 * Desktop ViewManager component - a button-based menu for saving and swapping between named
 * bundles of persisted component state (e.g. grid views, dashboards, and similar).
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
        defaultViewIcon = Icon.bookmark(),
        ownedViewIcon = Icon.bookmark(),
        sharedViewIcon = Icon.users(),
        globalViewIcon = Icon.globe(),
        showSaveButton = 'whenDirty',
        showRevertButton = 'never',
        buttonSide = 'right'
    }: ViewManagerProps) {
        const {loadModel} = model,
            locModel = useLocalModel(() => new ViewManagerLocalModel(model)),
            save = saveButton({model: locModel, mode: showSaveButton, ...saveButtonProps}),
            revert = revertButton({model: locModel, mode: showRevertButton, ...revertButtonProps}),
            menu = popover({
                disabled: !locModel.isVisible, // Prevent orphaned popover menu
                item: menuButton({
                    model: locModel,
                    icon: buttonIcon({
                        model: locModel,
                        defaultViewIcon,
                        ownedViewIcon,
                        sharedViewIcon,
                        globalViewIcon
                    }),
                    ...menuButtonProps
                }),
                content: loadModel.isPending
                    ? box({
                          item: spinner({compact: true}),
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 30,
                          width: 30
                      })
                    : viewMenu({model: locModel}),
                onOpening: () => model.refreshAsync(),
                placement: 'bottom',
                popoverClassName: 'xh-view-manager__popover'
            });
        return fragment(
            hbox({
                className,
                items: buttonSide == 'left' ? [revert, save, menu] : [menu, save, revert],
                ref: useOnVisibleChange(isVisible => (locModel.isVisible = isVisible))
            }),
            manageDialog({model: locModel.manageDialogModel}),
            saveAsDialog({model: locModel.saveAsDialogModel})
        );
    }
});

const menuButton = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, icon, ...rest}) {
        const {view, typeDisplayName, isLoading} = model.parent;
        return button({
            className: 'xh-view-manager__menu-button',
            text: view.isDefault ? `Default ${startCase(typeDisplayName)}` : view.name,
            icon: !isLoading
                ? icon
                : box({
                      item: spinner({width: 13, height: 13, style: {margin: 'auto'}}),
                      width: 16.25
                  }),
            rightIcon: Icon.chevronDown(),
            outlined: true,
            ...rest
        });
    }
});

const buttonIcon = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, ownedViewIcon, sharedViewIcon, globalViewIcon, defaultViewIcon}) {
        const {view} = model.parent;
        if (view.isOwned) return ownedViewIcon;
        if (view.isShared) return sharedViewIcon;
        if (view.isGlobal) return globalViewIcon;
        return defaultViewIcon;
    }
});

const saveButton = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, mode, ...rest}) {
        if (hideStateButton(model, mode)) return null;
        const {parent} = model,
            {typeDisplayName, isLoading, isValueDirty} = parent;
        return button({
            className: 'xh-view-manager__save-button',
            icon: Icon.save(),
            tooltip: `Save changes to this ${typeDisplayName}`,
            intent: 'primary',
            disabled: !isValueDirty || isLoading,
            onClick: () => model.saveAsync(),
            ...rest
        });
    }
});

const revertButton = hoistCmp.factory<ViewManagerLocalModel>({
    render({model, mode, ...rest}) {
        if (hideStateButton(model, mode)) return null;
        const {typeDisplayName, isLoading, isValueDirty} = model.parent;
        return button({
            className: 'xh-view-manager__revert-button',
            icon: Icon.reset(),
            tooltip: `Revert changes to this ${typeDisplayName}`,
            intent: 'danger',
            disabled: !isValueDirty || isLoading,
            onClick: () => model.revertAsync(),
            ...rest
        });
    }
});

function hideStateButton(model: ViewManagerLocalModel, mode: ViewManagerStateButtonMode): boolean {
    const {parent} = model;
    return (
        mode === 'never' ||
        (mode === 'whenDirty' && !parent.isValueDirty) ||
        parent.isViewAutoSavable
    );
}
