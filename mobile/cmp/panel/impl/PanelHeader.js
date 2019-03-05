/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox, div, filler} from '@xh/hoist/cmp/layout';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent
export class PanelHeader extends Component {

    render() {
        let {title, icon, headerItems = []} = this.props;

        if (!title && !icon && !headerItems.length) return null;

        return hbox({
            className: 'xh-panel-header',
            items: [
                icon || null,
                title ?
                    div({
                        className: 'xh-panel-header-title',
                        flex: 1,
                        item: title
                    }) :
                    filler(),
                ...headerItems
            ]
        });
    }

}

export const panelHeader = elemFactory(PanelHeader);