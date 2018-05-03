/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {isObject} from 'lodash';
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
        const {className, topToolbar, bottomToolbar, title, icon, children, ...conf} = this.props,
            headerConfig = isObject(title) ? title : {title, icon},
            baseCls = 'xh-panel';

        return vframe({
            cls: className ? `${baseCls} ${className}` : baseCls,
            ...conf,
            items: [
                panelHeader({...headerConfig}),
                topToolbar ? topToolbar : null,
                ...children,
                bottomToolbar ? bottomToolbar : null
            ]
        });
    }
}

export const panel = elemFactory(Panel);