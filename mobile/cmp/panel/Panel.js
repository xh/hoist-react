/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {hoistCmp} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {loadingIndicator} from '@xh/hoist/mobile/cmp/loadingindicator';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {isReactElement} from '@xh/hoist/utils/react';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {panelHeader} from './impl/PanelHeader';

import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';

import './Panel.scss';

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 */
export const [Panel, panel] = hoistCmp.withFactory({
    displayName: 'Panel',
    className: 'xh-panel',
    model: false, memo: false,

    render(props) {
        let [layoutProps, nonLayoutProps] = splitLayoutProps(props);

        const {
            className,
            tbar,
            bbar,
            title,
            icon,
            headerItems,
            mask: maskProp,
            loadingIndicator: loadingIndicatorProp,
            scrollable,
            children,
            ...rest
        } = nonLayoutProps;

        // 1) Pre-process layout
        // Block unwanted use of padding props, which will separate the panel's header
        // and bottom toolbar from its edges in a confusing way.
        layoutProps = omitBy(layoutProps, (v, k) => k.startsWith('padding'));

        // Give Panels a default flexing behavior if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        // 1) Prepare combined layout with header above core.
        return vbox({
            items: [
                panelHeader({title, icon, headerItems}),
                parseToolbar(tbar),
                vframe(castArray(children)),
                parseToolbar(bbar),
                parseLoadDecorator(maskProp, mask),
                parseLoadDecorator(loadingIndicatorProp, loadingIndicator)
            ],
            ...rest,
            ...layoutProps,
            className: classNames(className, scrollable ? 'xh-panel-scrollable' : null)
        });
    }
});

Panel.propTypes = {
    /** A toolbar to be docked at the bottom of the panel. */
    bbar: PT.oneOfType([PT.element, PT.array]),

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

    /**
     * Message to render unobtrusively on panel corner. Set to:
     *   + a ReactElement specifying a LoadingIndicator instance - or -
     *   + a PendingTaskModel for a default LoadingIndicator w/spinner bound to that model - or -
     *   + true for a simple default LoadingIndicator.
     */
    loadingIndicator: PT.oneOfType([PT.element, PT.instanceOf(PendingTaskModel), PT.bool]),

    /** Allow the panel to scroll vertically */
    scrollable: PT.bool,

    /** A toolbar to be docked at the top of the panel. */
    tbar: PT.oneOfType([PT.element, PT.array]),

    /** Title text added to the panel's header. */
    title: PT.oneOfType([PT.string, PT.node])
};

//------------------------
// Implementation
//------------------------
// LoadingIndicator/Mask is as provided, or a default simple loadingIndicator/mask.
function parseLoadDecorator(prop, cmp) {
    let ret = null;
    if (prop === true) {
        ret = cmp({isDisplayed: true});
    } else if (prop instanceof PendingTaskModel) {
        ret = cmp({model: prop, spinner: true});
    } else if (isReactElement(prop)) {
        ret = prop;
    }

    return ret;
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}