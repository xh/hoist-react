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
import {elemFactory, HoistComponent, LayoutSupport, CollapseSupport} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';

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

    @observable _collapsed = false;
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
        /** True to render this panel with a mask, disabling any interaction. */
        masked: PT.bool,
        /** Text to display within this panel's mask. */
        maskText: PT.string,
        /** Side to which Panel is collapsed, or false to indicate panel is not collapsed. @See CollapseSupport. */
        collapsed: PT.oneOf(['top', 'bottom', 'left', 'right', true, false]),
        /** How should collapsed content be rendered?  Defaults to 'lazy'. */
        collapseRenderMode: PT.oneOf(['lazy', 'always', 'unmountOnHide']),
        /** Enable Affordance to toggle collapse state */
        collapseToggleOnDblClick: PT.bool,
        /** Callback when collapse toggled. Will receive new value of collapsed, */
        onCollapsedChange: PT.func
    };

    baseCls = 'xh-panel';

    render() {
        let {
            layoutConfig,
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            masked,
            maskText,
            isCollapsed,
            collapsed,
            collapsedRenderMode = 'always',
            collapseToggleOnDblClick = true,
            onCollapsedChange,
            children,
            ...rest
        } = this.props;

        if (collapsed != undefined) {
            this.setCollapsed(collapsed);
        }
        const {_collapsed, _wasDisplayed} = this;

        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        layoutConfig = omitBy(layoutConfig, (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutConfig.width == null && layoutConfig.height == null && layoutConfig.flex == null) {
            layoutConfig.flex = 'auto';
        }

        let coreContents = null;
        if (!_collapsed || collapsedRenderMode == 'always' || (collapsedRenderMode == 'lazy' && _wasDisplayed)) {
            coreContents = vframe({
                style: {display: _collapsed ? 'none' : 'flex'},
                items: [
                    tbar || null,
                    ...(castArray(children)),
                    bbar || null
                ]
            });
        }

        this._wasDisplayed = _wasDisplayed || !_collapsed;

        return vbox({
            cls: this.getClassNames(),
            layoutConfig,
            ...rest,
            items: [
                panelHeader({panel: this}),
                coreContents,
                mask({
                    isDisplayed: masked,
                    text: maskText
                })
            ]
        });
    }


    //----------------------------
    // Implementation
    //----------------------------
    @action
    setCollapsed(value) {
        this._collapsed = value;
        const {onCollapsedChange} = this.props;
        if (onCollapsedChange) {
            onCollapsedChange(value);
        }
    }
}
export const panel = elemFactory(Panel);
