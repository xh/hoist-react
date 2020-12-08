/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {fmtTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import PT from 'prop-types';

/**
 * Provides a visual indicator of connection status for {@see WebSocketService}.
 */
export const [WebSocketIndicator, webSocketIndicator] = hoistCmp.withFactory({
    displayName: 'WebSocketIndicator',
    model: false,

    render({iconOnly, ...props}) {
        const {enabled, connected, lastMessageTime} = XH.webSocketService;
        let icon, txt, tooltip;

        if (!enabled) {
            icon = Icon.disabled({className: 'xh-text-color-muted'});
            txt = 'Disabled';
            tooltip = 'WebSockets not enabled for this application';
        } else if (connected) {
            icon = Icon.circle({prefix: 'fas', className: 'xh-intent-success'});
            txt = 'Connected';
            tooltip = `Last message: ${fmtTime(lastMessageTime)}`;
        } else {
            icon = Icon.xCircle({className: 'xh-intent-danger'});
            txt = 'Disconnected';
            tooltip = 'WebSockets enabled but not connected (unexpected)';
        }

        return hbox({
            items: [
                icon,
                span({
                    item: txt,
                    omit: iconOnly,
                    style: {margin: 8, cursor: 'help'}
                })
            ],
            title: tooltip,
            alignItems: 'center',
            ...props
        });
    }
});

WebSocketIndicator.propTypes = {
    /** True to display status as an icon only, without text label. */
    iconOnly: PT.bool
};
