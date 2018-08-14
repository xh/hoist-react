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
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';

import {PanelSizingModel} from './PanelSizingModel';
import {panelHeader} from './impl/PanelHeader';
import {resizeContainer} from './impl/ResizeContainer';

import './Panel.scss';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 *
 * This component also includes support for resizing and collapsing its contents, if given a
 * PanelSizingModel.
 */
@HoistComponent()
@LayoutSupport
export class Panel extends Component {

    wasDisplayed = false;

    static propTypes = {
        /** A title text added to the panel's header. */
        title: PT.oneOfType([PT.string, PT.node]),
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
        /** Model governing Resizing and Collapsing of the panel.*/
        sizingModel: PT.instanceOf(PanelSizingModel)
    };

    baseClassName = 'xh-panel';

    render() {
        const {
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            masked,
            maskText,
            sizingModel,
            children,
            ...rest
        } = this.getNonLayoutProps();

        // 1) Pre-process layout
        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        const layoutProps = omitBy(this.getLayoutProps(), (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        // 2) Prepare 'core' contents according to collapsed state
        const {
            resizable = false,
            collapsible = false,
            collapsed = false,
            collapsedRenderMode = null
        } = sizingModel || {};

        let coreContents = null;
        if (!collapsed || collapsedRenderMode == 'always' || (collapsedRenderMode == 'lazy' && this.wasDisplayed)) {
            coreContents = vframe({
                style: {display: collapsed ? 'none' : 'flex'},
                items: [
                    tbar || null,
                    ...(castArray(children)),
                    bbar || null
                ]
            });
        }
        if (!collapsed) this.wasDisplayed = true;

        // 3) Prepare combined layout with header above core.  This is what layout props are trampolined to
        const item = vbox({
            items: [
                panelHeader({title, icon, headerItems, sizingModel}),
                coreContents,
                mask({
                    isDisplayed: masked,
                    text: maskText
                })
            ],
            ...rest,
            ...layoutProps,
            className: this.getClassName()
        });

        // 4) Return, wrapped in resizable and its affordances if needed.
        return resizable || collapsible ?
            resizeContainer({item, model: sizingModel}) :
            item;
    }
}
export const panel = elemFactory(Panel);
