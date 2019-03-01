/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {isReactElement} from '@xh/hoist/utils/react';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {panelHeader} from './impl/PanelHeader';
import {resizeContainer} from './impl/ResizeContainer';
import {PanelModel} from './PanelModel';

import './Panel.scss';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 *
 * Panels also support resizing and collapsing their contents via its `model` prop. Provide an
 * optional `PanelModel` config as a prop to enable and customize these features.
 *
 * @see PanelModel
 */
@HoistComponent
@LayoutSupport
export class Panel extends Component {

    wasDisplayed = false;

    static modelClass = PanelModel;

    static propTypes = {
        /** A toolbar to be docked at the bottom of the panel. */
        bbar: PT.element,

        /** Items to be added to the right-side of the panel's header. */
        headerItems: PT.node,

        /** An icon placed at the left-side of the panel's header. */
        icon: PT.element,

        /**
         * Mask to render on this panel. Set to:
         *   + a ReactElement specifying a Mask instance - or -
         *   + a PendingTaskModel for a default loading mask w/spinner bound to that model - or -
         *   + true for a simple default mask.
         */
        mask: PT.oneOfType([PT.element, PT.instanceOf(PendingTaskModel), PT.bool]),

        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(PanelModel), PT.object]),

        /** A toolbar to be docked at the top of the panel. */
        tbar: PT.element,

        /** Title text added to the panel's header. */
        title: PT.oneOfType([PT.string, PT.node])
    };

    baseClassName = 'xh-panel';

    render() {
        const {
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            mask: maskProp,
            children,
            model: modelProp,
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
        const {model} = this;
        const {
            resizable = false,
            collapsible = false,
            collapsed = false,
            collapsedRenderMode = null,
            vertical = false
        } = model || {};

        if (collapsed) {
            delete layoutProps[`min${vertical ? 'Height' : 'Width'}`];
            delete layoutProps[vertical ? 'height' : 'width'];
        }

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

        // 3) Mask is as provided, or a default simple mask.
        let maskElem = null;
        if (maskProp === true) {
            maskElem = mask({isDisplayed: true});
        } else if (maskProp instanceof PendingTaskModel) {
            maskElem = mask({model: maskProp, spinner: true});
        } else if (isReactElement(maskProp)) {
            maskElem = maskProp;
        }

        // 4) Prepare combined layout with header above core.  This is what layout props are trampolined to
        const item = vbox({
            items: [
                panelHeader({title, icon, headerItems, model}),
                coreContents,
                maskElem
            ],
            ...rest,
            ...layoutProps,
            className: this.getClassName()
        });

        // 5) Return, wrapped in resizable and its affordances if needed.
        return resizable || collapsible ?
            resizeContainer({item, model}) :
            item;
    }
}
export const panel = elemFactory(Panel);
