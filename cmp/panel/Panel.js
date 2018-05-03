/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {vframe} from 'hoist/layout';
import {panelHeader} from './impl/PanelHeader';


/**
 * A Panel container
 *
 * This component is designed to contain a box container (body), top and bottom toolbars, and
 * a title bar.
 *
 */

@hoistComponent()
export class Panel extends Component {
    render() {
        const { className, topToolbar, bottomToolbar,
                title, icon, headerItems, children, ...conf } = this.props,
            baseCls = 'xh-panel';

        return vframe({
            cls: className ? `${baseCls} ${className}` : baseCls,
            ...conf,
            items: [
                panelHeader({title, icon, headerItems}),
                topToolbar ? topToolbar : null,
                ...children,
                bottomToolbar ? bottomToolbar : null
            ]
        });
    }
}

export const panel = elemFactory(Panel);