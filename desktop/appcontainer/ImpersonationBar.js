/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HotkeysTarget, hotkeys, hotkey} from '@xh/hoist/kit/blueprint';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {filler, span} from '@xh/hoist/cmp/layout';
import {comboBox} from '@xh/hoist/desktop/cmp/form';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @private
 */
@HoistComponent
@HotkeysTarget
export class ImpersonationBar extends Component {

    @observable pendingTarget = null;

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
        const {canImpersonate, isImpersonating, isOpen, targets} = this.model;

        if (!canImpersonate) return null;
        if (!isOpen) return span();  // *Not* null, so hotkeys get rendered.
    
        return toolbar({
            style: {color: 'white', backgroundColor: 'midnightblue', zIndex: 9999},
            items: [
                Icon.user(),
                span(`${isImpersonating ? 'Impersonating' : ''} ${XH.getUsername()}`),
                filler(),
                // Note we deliberately do not requireSelection, as some apps will be able to
                // create unknown users on the fly.
                comboBox({
                    model: this,
                    field: 'pendingTarget',
                    options: targets,
                    placeholder: 'Select User...',
                    onCommit: this.onCommit
                }),
                this.exitButton()
            ]
        });
    }

    exitButton() {
        const text = XH.identityService.isImpersonating ? 'Exit Impersonation' : 'Cancel';
        return button({
            text,
            onClick: this.onExitClick
        });
    }

    //---------------------
    // Implementation
    //---------------------
    onHotKey = () => {
        this.model.toggleVisibility();
    }

    onCommit = () => {
        if (this.pendingTarget) {
            this.model.impersonateAsync(
                this.pendingTarget
            ).catch(e => {
                this.setPendingTarget('');
                XH.handleException(e, {logOnServer: false});  // likely to be an unknown user
            });
        }
    }

    onExitClick = () => {
        const {model} = this;
        if (model.isImpersonating) {
            model.endImpersonateAsync();
        } else {
            model.hide();
        }
    }

    @action
    setPendingTarget(pendingTarget) {
        this.pendingTarget = pendingTarget;
    }

}
export const impersonationBar = elemFactory(ImpersonationBar);