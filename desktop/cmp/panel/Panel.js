/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {observable, action} from 'mobx';
import {castArray, omitBy} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {CollapseModel, CollapseState} from '@xh/hoist/desktop/cmp/mask';

import {panelHeader} from './impl/PanelHeader';
import './Panel.scss';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 *
 * This component also includes support for collapsing its contents.  When collapsed, it will
 * render portions of it header element only.
 */
@HoistComponent()
@LayoutSupport
@CollapseSupport
export class Panel extends Component {

    wasDisplayed = false;

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
        /** True to render this panel with a mask, disabling any interaction. */
        masked: PT.bool,
        /** Text to display within this panel's mask. */
        maskText: PT.string,
        /** Model governing Collapse state of the panel. @See CollapseSupport. */
        collapseModel: PT.instanceOf(CollapseModel),
        /** Enable Affordance to toggle collapse state when double clicking header.*/
        collapseToggleOnDblClick: PT.bool
    };

    baseClassName = 'xh-panel';

    render() {
        let {
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            masked,
            maskText,
            collapseModel,
            collapseToggleOnDblClick = true,
            children,
            ...rest
        } = this.getNonLayoutProps();

        const collapsed = collapseModel && collapseModel.collapsed,
            collapsedSide = collapsed ? collapsedModel.side : null,
            renderMode = collapseModel && collapseModel.renderMode,
            wasDisplayed = this.wasDisplayed

        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        const layoutProps = omitBy(this.getLayoutProps(), (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        let coreContents = null;
        if (!collapsed || renderMode == 'always' || (renderMode == 'lazy' && wasDisplayed)) {
            coreContents = vframe({
                style: {display: _collapsed ? 'none' : 'flex'},
                items: [
                    tbar || null,
                    ...(castArray(children)),
                    bbar || null
                ]
            });
        }

        this.wasDisplayed = wasDisplayed || !collapsed;

        return vbox({
            ...layoutProps,
            cls: this.getClassNames(),
            ...rest,
            items: [
                panelHeader({
                    title,
                    icon,
                    headerItems,
                    vertical: ['left', 'right'].includes(collapsedSide),
                    onDblClick: () => this.onHeaderDblClick
                }),
                coreContents,
                mask({
                    isDisplayed: masked,
                    text: maskText
                })
            ],
            ...rest,
            className: this.getClassName()
            ]
        });
    }


    //----------------------------
    // Implementation
    //----------------------------
    @action
    onHeaderDblClick = () => {
        const {collapseModel, collapseToggleOnDblClick} = this;
        if (collapseModel && collapseToggleOnDblClick) {
            collapseModel.toggleCollapsed();
        }
    }
}
export const panel = elemFactory(Panel);
