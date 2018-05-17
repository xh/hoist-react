/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from 'hoist/core';
import {vbox, filler, span, box} from 'hoist/layout';
import {button, popover, hotkeys, hotkey} from 'hoist/kit/blueprint';
import {comboField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {ImpersonationBarModel} from './ImpersonationBarModel';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 */
@HoistComponent()
export class ImpersonationBar extends Component {

    localModel = new ImpersonationBarModel();

    renderHotkeys() {
        return hotkeys(
            hotkey({
                global: true,
                combo: 'shift + i',
                label: 'Open Impersonation Dialog',
                onKeyDown: this.onHotKey
            })
        );
    }

    render() {
        const {isImpersonating, username, authUser} = XH.identityService;

        if (!authUser.isHoistAdmin) return null;

        if (!this.model.isVisible) return span();  // *Not* null, so hotkeys get rendered.

        return toolbar({
            style: {color: 'white', backgroundColor: 'midnightblue', zIndex: 9999},
            items: [
                Icon.user(),
                span(`${isImpersonating ? 'Impersonating' : ''} ${username}`),
                filler(),
                this.switchButton(),
                this.exitButton()
            ]
        });
    }

    switchButton() {
        const model = this.model;

        return popover({
            target: button({
                text: 'Switch User',
                style: {minWidth: 130},
                onClick: model.openTargetDialog
            }),
            isOpen: model.targetDialogOpen,
            hasBackdrop: true,
            content: vbox({
                items: [
                    box({
                        padding: 10,
                        item: comboField({
                            model,
                            field: 'selectedTarget',
                            options: model.targets,
                            placeholder: 'Select User...'
                        })
                    }),
                    toolbar(
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: this.onCloseClick
                        }),
                        button({
                            text: 'OK',
                            intent: 'primary',
                            onClick: this.onOKClick,
                            disabled: !model.selectedTarget
                        })
                    )
                ]
            })
        });
    }

    exitButton() {
        const text = XH.identityService.isImpersonating ? 'Exit Impersonation' : 'Close';
        return button({
            text,
            icon: Icon.close(),
            onClick: this.onExitClick
        });
    }

    //---------------------
    // Implementation
    //---------------------
    onHotKey = () => {
        this.model.toggleVisibility();
    }

    onOKClick = () => {
        this.model.doImpersonate();
    }

    onSwitchClick = () => {
        this.model.openTargetDialog();
    }

    onCloseClick = () => {
        this.model.closeTargetDialog();
    }

    onExitClick = () => {
        this.model.doExit();
    }
}
export const impersonationBar = elemFactory(ImpersonationBar);