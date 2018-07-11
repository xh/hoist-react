/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox} from '../../index';

import './PanelHeader.scss';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent()
class PanelHeader extends Component {
    render() {
        const {title, icon, headerItems = []} = this.props;

        if (!title && !icon && !headerItems.length) return null;

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
            ]
        });
    }
}
export const panelHeader = elemFactory(PanelHeader);
