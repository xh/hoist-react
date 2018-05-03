/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {box, hbox} from 'hoist/layout';
import './PanelHeader.scss';


/**
 * A Panel container
 *
 * This component is designed to contain a box container (body), top and bottom toolbars, and
 * a title bar.
 *
 */

@hoistComponent()
class PanelHeader extends Component {
    render() {
        const {title, icon, headerItems = []} = this.props;

        if (!title && !icon) return null;

        return hbox({
            cls: 'xh-panel-header',
            items: [
                icon ? icon : null,
                title ? box({
                    flex: 1,
                    items: [
                        box({
                            flex: 1,
                            item: title
                        }),
                        ...headerItems
                    ]
                }) : null
            ]
        });
    }
}

export const panelHeader = elemFactory(PanelHeader);