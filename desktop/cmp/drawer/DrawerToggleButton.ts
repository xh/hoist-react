/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {logError} from '@xh/hoist/utils/js';
import {DrawerMode, DrawerModel} from './DrawerModel';

export type DrawerToggleAction = 'toggleOverlay' | 'cycleMode' | 'pin' | 'collapse';

export interface DrawerToggleButtonProps extends ButtonProps {
    /** DrawerModel to control. Falls back to context lookup. */
    drawerModel?: DrawerModel;

    /**
     * Action to perform on click.
     *   - 'toggleOverlay' (default): opens/closes the overlay.
     *   - 'cycleMode': cycles through supported modes.
     *   - 'pin': sets pinned mode.
     *   - 'collapse': sets collapsed mode.
     */
    action?: DrawerToggleAction;
}

/**
 * A convenience button for controlling a Drawer's display mode or overlay visibility.
 * Can be placed anywhere - in a toolbar, panel header, or within the drawer's own content.
 *
 * Automatically adjusts its icon and tooltip based on the drawer's current state and the
 * configured action.
 */
export const [DrawerToggleButton, drawerToggleButton] =
    hoistCmp.withFactory<DrawerToggleButtonProps>({
        displayName: 'DrawerToggleButton',
        className: 'xh-drawer-toggle-button',
        model: false,

        render(
            {className, title, tooltip, drawerModel, action = 'toggleOverlay', disabled, ...rest},
            ref
        ) {
            drawerModel = drawerModel ?? useContextModel(DrawerModel);

            if (!drawerModel) {
                logError(
                    'No DrawerModel available - provide via `drawerModel` prop or context - button will be disabled.',
                    DrawerToggleButton
                );
                disabled = true;
            }

            const icon = getIcon(drawerModel, action);
            if (!title && !tooltip) {
                tooltip = getTooltip(drawerModel, action);
            }

            return button({
                ref,
                icon,
                title,
                tooltip,
                onClick: () => handleClick(drawerModel, action),
                minimal: true,
                className,
                disabled,
                ...rest
            });
        }
    });

//------------------
// Implementation
//------------------
function handleClick(model: DrawerModel, action: DrawerToggleAction) {
    if (!model) return;
    switch (action) {
        case 'toggleOverlay':
            return model.toggleOverlay();
        case 'cycleMode':
            return model.cycleMode();
        case 'pin':
            return model.pin();
        case 'collapse':
            return model.collapse();
    }
}

function getIcon(model: DrawerModel, action: DrawerToggleAction) {
    if (!model) return Icon.bars();
    switch (action) {
        case 'toggleOverlay':
            return model.isOverlayOpen ? Icon.close() : Icon.bars();
        case 'cycleMode':
            return getModeIcon(getNextMode(model));
        case 'pin':
            return Icon.arrowToRight();
        case 'collapse':
            return Icon.collapse();
    }
}

function getTooltip(model: DrawerModel, action: DrawerToggleAction): string {
    if (!model) return 'Toggle drawer';
    switch (action) {
        case 'toggleOverlay':
            return model.isOverlayOpen ? 'Close drawer' : 'Open drawer';
        case 'cycleMode':
            return getModeTooltip(getNextMode(model));
        case 'pin':
            return 'Pin drawer';
        case 'collapse':
            return 'Collapse drawer';
    }
}

function getNextMode(model: DrawerModel): DrawerMode {
    const {supportedModes, mode} = model,
        idx = supportedModes.indexOf(mode);
    return supportedModes[(idx + 1) % supportedModes.length];
}

function getModeIcon(mode: DrawerMode) {
    switch (mode) {
        case 'pinned':
            return Icon.arrowToRight();
        case 'collapsed':
            return Icon.collapse();
        case 'overlay':
            return Icon.bars();
    }
}

function getModeTooltip(mode: DrawerMode): string {
    switch (mode) {
        case 'pinned':
            return 'Pin drawer';
        case 'collapsed':
            return 'Collapse drawer';
        case 'overlay':
            return 'Show as overlay';
    }
}
