/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {selectField} from '@xh/hoist/mobile/cmp/form';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './ImpersonationBar.scss';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @private
 */
@HoistComponent()
export class ImpersonationBar extends Component {

    render() {
        const {isOpen, targets} = this.model;

        if (!isOpen) return null;

        const username = XH.getUsername(),
            options = [username, ...targets];

        return div({
            cls: 'xh-impersonation-bar',
            items: [
                Icon.user({size: 'lg'}),
                selectField({
                    value: username,
                    options: options,
                    commitOnChange: true,
                    onCommit: this.onCommit
                }),
                button({
                    icon: Icon.close(),
                    onClick: this.onExitClick
                })
            ]
        });
    }

    //---------------------
    // Implementation
    //---------------------
    onCommit = (target) => {
        this.model.impersonateAsync(target);
    }

    onExitClick = () => {
        const {model} = this;
        if (model.isImpersonating) {
            model.endImpersonateAsync();
        } else {
            model.hide();
        }
    }
}
export const impersonationBar = elemFactory(ImpersonationBar);