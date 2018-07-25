/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {vbox} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';

import {panelHeader} from './impl/PanelHeader';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 *
 * This component also includes support for collapsing its contents.  When collapsed, it will
 * render its header element only.
 */
@HoistComponent({collapseSupport:true})
@LayoutSupport
export class Panel extends Component {

    _wasDisplayed = false;

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
        masked: PT.bool,
        /** Should the panel be rendered with its main content and toolbars hidden? */
        collapsed: PT.oneOf(['top', 'bottom', 'left', 'right', false]),
        /** How should collapsed content be rendered?  Defaults to 'lazy'. */
        collapseRenderMode: PT.oneOf(['lazy', 'always', 'unmountOnHide']),

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
            collapsed,
            collapsedRenderMode,
            children,
            ...rest
        } = this.props;


        collapsed = (collapsed != undefined ? collapsed : null);
        collapsedRenderMode = (collapsedRenderMode != undefined ? collapsedRenderMode : 'always');

        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        layoutConfig = omitBy(layoutConfig, (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutConfig.width == null && layoutConfig.height == null && layoutConfig.flex == null) {
            layoutConfig.flex = 'auto';
        }

        this._wasDisplayed = this._wasDisplayed || !collapsed;
        let coreContents = null;
        if (!collapsed || collapsedRenderMode == 'always' || (collapsedRenderMode == 'lazy' && this._wasDisplayed)) {
            coreContents = vframe({
                style: {display: collapsed ? 'none' : 'flex'},
                items: [
                    tbar || null,
                    ...(castArray(children)),
                    bbar || null
                ]
            });
        }

        return vbox({
            cls: className ? `${this.baseCls} ${className}` : this.baseCls,
            layoutConfig,
            ...rest,
            items: [
                panelHeader({title, icon, collapsed, headerItems}),
                coreContents,
                mask({isDisplayed: masked})
            ]
        });
    }
}
export const panel = elemFactory(Panel);
