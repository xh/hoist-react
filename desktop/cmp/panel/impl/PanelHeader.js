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
export class PanelHeader extends Component {
    render() {
        const {title, icon, headerItems = [], sizingModel} = this.props,
            {collapsible, collapsed, side} = sizingModel || {};

        if (!collapsible && !title && !icon && !headerItems.length) return null;

        const vertical = collapsed && ['left', 'right'].includes(side);
        if (!vertical) {
            return hbox({
                className: 'xh-panel-header',
                items: [
                    icon || null,
                    title ? box({
                        className: 'xh-panel-header-title',
                        flex: 1,
                        item: title
                    }) : null,
                    ...headerItems
                ],
                onDoubleClick: this.onDblClick
            });
        } else {
            return vbox({
                className: 'xh-panel-header',
                items: icon || null,
                // TODO:  Add vertically rotated text.
                onDoubleClick: this.onDblClick
            });
        }
    }
}

onDblClick = () => {
    const {sizingModel} = this.props;
    if (sizingModel && sizingModel.collapsible) {
        sizingModel.toggleCollapsed();
    }
}

export const panelHeader = elemFactory(PanelHeader);
