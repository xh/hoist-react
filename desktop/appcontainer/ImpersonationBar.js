/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ImpersonationBarModel} from '@xh/hoist/appcontainer/ImpersonationBarModel';
import {filler, hspacer, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import './ImpersonationBar.scss';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @private
 */
export const impersonationBar = hoistCmp.factory({
    displayName: 'ImpersonationBar',
    model: uses(ImpersonationBarModel),

    render({model}) {
        const {isImpersonating, canImpersonate, authUsername, username} = XH.identityService;

        const impl = useLocalModel(LocalModel);
        impl.model = model;

        if (!canImpersonate || !model.isOpen) return null;

        const {targets} = model;

        let msg = `Logged in as ${authUsername}`;
        if (isImpersonating) {
            msg += ` › impersonating ${username}`;
        }

        return toolbar({
            className: 'xh-impersonation-bar',
            items: [
                hspacer(5),
                Icon.impersonate(),
                span(msg),
                filler(),
                select({
                    model: impl,
                    bind: 'pendingTarget',
                    options: targets,
                    enableCreate: true,
                    placeholder: 'Select User...',
                    width: 250,
                    onCommit: impl.onCommit
                }),
                button({
                    text: isImpersonating ? 'Exit Impersonation' : 'Cancel',
                    style: {color: 'white'},
                    onClick: impl.onExitClick
                })
            ]
        });
    }
});


@HoistModel
class LocalModel {

    model;
    @bindable pendingTarget = null;

    onCommit = () => {
        if (this.pendingTarget) {
            XH.identityService.impersonateAsync(
                this.pendingTarget
            ).catch(e => {
                this.setPendingTarget('');
                XH.handleException(e, {logOnServer: false});  // likely to be an unknown user
            });
        }
    };

    onExitClick = () => {
        const {identityService} = XH;
        if (identityService.isImpersonating) {
            identityService.endImpersonateAsync();
        } else {
            this.model.hide();
        }
    };
}