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

import './Panel.scss';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 */
@HoistComponent
@LayoutSupport
export class Panel extends Component {

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

        /** Allow the panel to scroll vertically */
        scrollable: PT.bool,

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
            scrollable,
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

        // 2) Mask is as provided, or a default simple mask.
        let maskElem = null;
        if (maskProp === true) {
            maskElem = mask({isDisplayed: true});
        } else if (maskProp instanceof PendingTaskModel) {
            maskElem = mask({model: maskProp, spinner: true});
        } else if (isReactElement(maskProp)) {
            maskElem = maskProp;
        }

        // 3) Prepare combined layout with header above core.
        return vbox({
            items: [
                panelHeader({title, icon, headerItems}),
                tbar || null,
                vframe(castArray(children)),
                bbar || null,
                maskElem
            ],
            ...rest,
            ...layoutProps,
            className: this.getClassName(scrollable ? 'xh-panel-scrollable' : null)
        });
    }
}

export const panel = elemFactory(Panel);