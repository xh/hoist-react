/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
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

    static propTypes = {
        /** A title text added to the panel's header */
        title: PT.string,
        /** An icon placed at the left-side of the panel's header */
        icon: PT.element,
        /** Items to be added to the right-side of the panel's header */
        headerItems: PT.node,
        /** A toolbar to be docked at the top of the panel */
        topToolbar: PT.element,
        /** A toolbar to be docked at the bottom of the panel */
        bottomToolbar: PT.element
    };

    render() {
        const { className, topToolbar, bottomToolbar,
                title, icon, headerItems, children, ...rest } = this.props,
            baseCls = 'xh-panel';

        return vframe({
            cls: className ? `${baseCls} ${className}` : baseCls,
            ...rest,
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