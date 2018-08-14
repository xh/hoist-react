/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';

import './PanelHeader.scss';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent()
export class PanelHeader extends Component {
    render() {
        let {title, icon, headerItems = [], sizingModel} = this.props,
            {collapsible, collapsed, vertical} = sizingModel || {};

        if (!title && !icon && !headerItems.length) return null;

        if (!collapsed || vertical) {
            return hbox({
                className: 'xh-panel-header',
                items: [
                    icon || null,
                    title ?
                        box({
                            className: 'xh-panel-header-title',
                            flex: 1,
                            item: title
                        }) :
                        null,
                    ...(!collapsed ? headerItems : [])
                ],
                onDoubleClick: this.onDblClick
            });
        } else {
            // For Compressed vertical layout, skip header items.
            // TODO:  Add rotated Text box.
            return vbox({
                className: 'xh-panel-header',
                flex: 1,
                items: icon || null,
                onDoubleClick: this.onDblClick
            });
        }
    }

    onDblClick = () => {
        const {sizingModel} = this.props;
        if (sizingModel && sizingModel.collapsible) {
            sizingModel.toggleCollapsed();
        }
    }
}

export const panelHeader = elemFactory(PanelHeader);
