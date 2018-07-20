/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HotkeysTarget, hotkeys, hotkey} from '@xh/hoist/kit/blueprint';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {filler, span} from '@xh/hoist/cmp/layout';
import {comboField} from '@xh/hoist/desktop/cmp/form';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @private
 */
@HoistComponent()
@HotkeysTarget
export class ImpersonationBar extends Component {

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
        const {canImpersonate, isImpersonating, isBarVisible, targets} = this.model;

        if (!canImpersonate) return null;
        if (!isBarVisible) return span();  // *Not* null, so hotkeys get rendered.
        
        const username = XH.getUsername(),
            options = [username, ...targets];

        return toolbar({
            style: {color: 'white', backgroundColor: 'midnightblue', zIndex: 9999},
            items: [
                Icon.user(),
                span(`${isImpersonating ? 'Impersonating' : ''} ${XH.getUsername()}`),
                filler(),
                comboField({
                    value: username,
                    options,
                    placeholder: 'Select User...',
                    onCommit: this.onCommit
                }),
                this.exitButton()
            ]
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

    onCommit = (target) => {
        this.model.impersonateAsync(target);
    }

    onExitClick = () => {
        const {model} = this;
        if (model.isImpersonating) {
            model.endImpersonateAsync();
        } else {
            model.hideBar();
        }
    }
}
export const impersonationBar = elemFactory(ImpersonationBar);