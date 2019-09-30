/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isValidElement} from 'react';
import PT from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {loadingIndicator} from '@xh/hoist/mobile/cmp/loadingindicator';
import {mask} from '@xh/hoist/mobile/cmp/mask';
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
        const contextModel = useContextModel('*');

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
                parseLoadDecorator(maskProp, 'mask', contextModel),
                parseLoadDecorator(loadingIndicatorProp, 'loadingIndicator', contextModel)
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
     *   + a ReactElement specifying a Mask instance,
     *   + true for a default mask,
     *   + a PendingTaskModel for a default load mask bound to a pending task,
     *   + the string 'onLoad' for a default load mask bound to the loading of the current model.
     *     (current model must include @LoadSupport).
     */
    mask: PT.oneOfType([PT.element, PT.instanceOf(PendingTaskModel), PT.bool, PT.string]),

    /**
     * LoadingIndicator to render on this panel. Set to:
     *   + a ReactElement specifying a LoadingIndicator,
     *   + true for a default LoadingIndicator,
     *   + a PendingTaskModel for a default LoadingIndicator bound to a pending task,
     *   + the string 'onLoad' for a default LoadingIndicator bound to the loading of the current model.
     *     (current model must include @LoadSupport).
     */
    loadingIndicator: PT.oneOfType([PT.element, PT.instanceOf(PendingTaskModel), PT.bool, PT.string]),

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
function parseLoadDecorator(prop, name, contextModel) {
    const cmp = (name === 'mask' ? mask : loadingIndicator);
    if (prop === true)                      return cmp({isDisplayed: true});
    if (prop instanceof PendingTaskModel)   return cmp({model: prop, spinner: true});
    if (isValidElement(prop))               return prop;
    if (prop === 'onLoad') {
        const loadModel = contextModel?.loadModel;
        if (!loadModel) {
            console.warn(`Cannot use 'onLoad' for '${name}'.  Context model is not an instance of @LoadSupport or have a 'loadModel' property.`);
            return null;
        }
        return cmp({model: loadModel, spinner: true});
    }
    return null;
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}