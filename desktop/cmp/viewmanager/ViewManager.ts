/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {fragment, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {startCase} from 'lodash';
import {viewMenu} from './impl/ViewMenu';
import {manageDialog} from './impl/ManageDialog';
import {saveAsDialog} from './impl/SaveAsDialog';

import './ViewManager.scss';

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
            saveAsDialog()
        );
    }
});

const menuButton = hoistCmp.factory<ViewManagerModel>({
    render({model, ...rest}) {
        const {view, typeDisplayName, isLoading} = model;
        return button({
            className: 'xh-view-manager__menu-button',
            text: view.info?.shortDisplayName ?? `Default ${startCase(typeDisplayName)}`,
            icon: !isLoading ? Icon.bookmark() : Icon.spinner({className: 'fa-spin'}),
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
            disabled: !model.isValueDirty || model.isLoading,
            onClick: () => {
                model.isViewSavable ? model.saveAsync() : model.saveAsAsync();
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
            disabled: !model.isValueDirty || model.isLoading,
            onClick: () => model.resetAsync(),
            ...rest
        });
    }
});

function hideStateButton(model: ViewManagerModel, mode: ViewManagerStateButtonMode): boolean {
    return mode === 'never' || (mode === 'whenDirty' && !model.isValueDirty);
}
