/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ImpersonationBarModel} from '@xh/hoist/appcontainer/ImpersonationBarModel';
import {a, filler, fragment, h3, hspacer, li, p, span, ul} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import './ImpersonationBar.scss';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @internal
 */
export const impersonationBar = hoistCmp.factory({
    displayName: 'ImpersonationBar',
    model: uses(ImpersonationBarModel),

    render({model}) {
        const {isImpersonating, canAuthUserImpersonate, authUsername, username} =
            XH.identityService;

        if (!canAuthUserImpersonate || !model.isOpen) return null;

        const {targets} = model;

        let msg = `Logged in as ${authUsername}`,
            placeholder = 'Select a user...';

        if (isImpersonating) {
            msg += ` › impersonating ${username}`;
            placeholder = `Impersonating ${username}`;
        }

        return toolbar({
            className: 'xh-impersonation-bar',
            items: [
                Icon.impersonate(),
                span(msg),
                filler(),
                button({
                    text: 'Important Reminders',
                    icon: Icon.warning(),
                    outlined: true,
                    onClick: showUseResponsiblyAlert
                }),
                hspacer(),
                select({
                    bind: 'pendingTarget',
                    options: targets,
                    enableCreate: true,
                    // Autofocus when shown to begin impersonation
                    autoFocus: !isImpersonating,
                    placeholder,
                    createMessageFn: q => `Impersonate new user "${q}"`,
                    minWidth: 150,
                    maxWidth: 350,
                    menuWidth: 350,
                    flex: 1,
                    onCommit: model.onCommit,
                    ref: model.inputRef
                }),
                button({
                    text: isImpersonating ? 'Exit Impersonation' : 'Cancel',
                    outlined: true,
                    onClick: model.onClose
                })
            ]
        });
    }
});

const showUseResponsiblyAlert = () => {
    XH.alert({
        title: 'Important Reminders',
        icon: Icon.warning(),
        message: fragment(
            h3('With great power comes great responsibility.'),
            ul(
                li(
                    'While impersonating, anything you do will be as if the user you are impersonating had done it themselves.'
                ),
                li(
                    "Use care when updating any user settings - including grid and dashboard customizations. These are saved to the impersonated user's profile by default."
                ),
                li(
                    'Remember, not all options require an explicit step to save - e.g. changing a query control, re-ordering grid columns, or dragging around a dashboard widget.'
                ),
                li(
                    'Impersonation sessions are tracked and logged - who and when you start and stop impersonating will be recorded.'
                )
            ),
            p(
                'Contact ',
                a({href: 'mailto:support@xh.io', item: 'XH support'}),
                ' with any questions or concerns.'
            )
        ),
        confirmProps: {
            text: 'I understand and will be careful',
            autoFocus: false
        }
    });
};
