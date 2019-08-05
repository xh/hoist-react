/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hbox, span} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {fmtTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {Component} from 'react';
import PT from 'prop-types';

/**
 * Provides a visual indicator of connection status for {@see WebSocketService}.
 */
@LayoutSupport
@HoistComponent
export class WebSocketIndicator extends Component {

    static propTypes = {
        /** True to display status as an icon only, without text label. */
        iconOnly: PT.bool
    }

    render() {
        const {enabled, connected, lastMessageTime} = XH.webSocketService;
        let icon, txt, tooltip;

        if (!enabled) {
            icon = Icon.circle({prefix: 'fal', className: 'xh-text-color-muted'});
            txt = 'Disabled';
            tooltip = 'WebSockets not enabled for this application';
        } else if (connected) {
            icon = Icon.circle({prefix: 'fas', className: 'xh-green'});
            txt = 'Connected';
            tooltip = `Last message: ${fmtTime(lastMessageTime)}`;
        } else {
            icon = Icon.xCircle({prefix: 'fas', className: 'xh-red'});
            txt = 'Disconnected';
            tooltip = 'WebSockets enabled but not connected (unexpected)';
        }

        return hbox({
            items: [
                icon,
                span({
                    item: txt,
                    omit: this.props.iconOnly,
                    style: {margin: 8, cursor: 'help'}
                })
            ],
            title: tooltip,
            alignItems: 'center',
            ...this.getLayoutProps()
        });
    }
}

export const webSocketIndicator = elemFactory(WebSocketIndicator);