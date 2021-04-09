/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button/Button';
import {Icon} from '@xh/hoist/icon';

/**
 * Button that conditionally renders when there is a changelog entry for the current app version
 * that has yet to be viewed by the current user.
 *
 * {@see ChangelogService} for details on how to enable this overall system.
 */
export const [WhatsNewButton, whatsNewButton] = hoistCmp.withFactory({
    displayName: 'WhatsNewButton',
    model: false,

    render(props) {
        if (!XH.changelogService.currentVersionIsUnread) return null;

        return button({
            icon: Icon.gift(),
            title: `What's New?`,
            intent: 'primary',
            onClick: () => XH.showChangelog(),
            ...props
        });
    }
});
