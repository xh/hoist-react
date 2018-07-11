/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {vbox} from '@xh/hoist/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';

import {panelHeader} from './impl/PanelHeader';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 */
@HoistComponent({layoutSupport: true})
export class Panel extends Component {

    static propTypes = {
        /** A title text added to the panel's header. */
        title: PT.string,
        /** An icon placed at the left-side of the panel's header. */
        icon: PT.element,
        /** Items to be added to the right-side of the panel's header. */
        headerItems: PT.node,
        /** A toolbar to be docked at the top of the panel. */
        tbar: PT.element,
        /** A toolbar to be docked at the bottom of the panel. */
        bbar: PT.element,
        /** Whether this panel should be rendered with a mask, use to disable interaction with panel. */
        masked: PT.bool
    };

    baseCls = 'xh-panel';

    render() {
        let {
            className,
            layoutConfig,
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            masked,
            isCollapsed,
            children,
            ...rest
        } = this.props;

        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        layoutConfig = omitBy(layoutConfig, (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutConfig.width == null && layoutConfig.height == null && layoutConfig.flex == null) {
            layoutConfig.flex = 'auto';
        }

        return vbox({
            cls: className ? `${this.baseCls} ${className}` : this.baseCls,
            layoutConfig,
            ...rest,
            items: [
                panelHeader({title, icon, headerItems}),
                tbar || null,
                ...(castArray(children)),
                bbar || null,
                mask({isDisplayed: masked})
            ]
        });
    }
}
export const panel = elemFactory(Panel);
