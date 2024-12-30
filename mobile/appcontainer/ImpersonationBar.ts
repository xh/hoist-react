/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ImpersonationBarModel} from '@xh/hoist/appcontainer/ImpersonationBarModel';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {select} from '@xh/hoist/mobile/cmp/input';
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
        const {isOpen, targets} = model;
        if (!isOpen) return null;
        return div({
            className: 'xh-impersonation-bar',
            items: [
                Icon.impersonate({size: 'lg'}),
                select({
                    bind: 'pendingTarget',
                    options: targets,
                    enableCreate: true,
                    enableFilter: true,
                    enableFullscreen: true,
                    placeholder: 'Select a user to impersonate...',
                    createMessageFn: q => `Impersonate ${q}`,
                    onCommit: model.onCommit
                }),
                button({
                    icon: Icon.close(),
                    minimal: true,
                    onClick: model.onClose
                })
            ]
        });
    }
});
