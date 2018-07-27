/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox} from '@xh/hoist/cmp/layout';

import './PanelHeader.scss';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent()
class PanelHeader extends Component {

    render() {
        const {title, icon, headerItems = [], collapseDirection} = this.panel.props;

        if (!title && !icon && !headerItems.length) return null;

        if (['top', 'left'].includes(collapseDirection)) {
            return hbox({
                cls: 'xh-panel-header',
                items: [
                    icon || null,
                    title ? box({
                        cls: 'xh-panel-header-title',
                        flex: 1,
                        item: title
                    }) : null,
                    ...headerItems
                ],
                onDoubleClick: this.onDoubleClick
            });
        } else {
            return vbox({
                cls: 'xh-panel-header',
                items: icon || null,   // TODO:  Add vertically rotated text.
                onDoubleClick: this.onDoubleClick
            });
        }
    }

    //-------------------------
    // Implementation
    //-------------------------
    onDoubleClick = () => {
        const {panel} = this;
        if (panel.props.collapseToggleOnDblClick) {
            panel.toggleCollapsed(true);
        }
    }

    get panel() {
        return this.props.panel;
    }
}
export const panelHeader = elemFactory(PanelHeader);
