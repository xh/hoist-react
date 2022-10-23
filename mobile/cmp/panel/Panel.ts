/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, TaskObserver, useContextModel, Some, HoistProps, ElemFactory} from '@xh/hoist/core';
import {loadingIndicator} from '@xh/hoist/mobile/cmp/loadingindicator';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {omitBy} from 'lodash';
import {isValidElement, ReactNode, ReactElement} from 'react';
import {panelHeader} from './impl/PanelHeader';
import './Panel.scss';

export interface PanelProps extends HoistProps  {
    /** A toolbar to be docked at the bottom of the panel. */
    bbar?: Some<ReactNode>;

    /** Items to be added to the right-side of the panel's header. */
    headerItems?: ReactNode[];

    /** An icon placed at the left-side of the panel's header. */
    icon?: ReactElement;

    /**
     * Mask to render on this panel. Set to:
     *   + a ReactElement specifying a Mask instance,
     *   + true for a default mask,
     *   + one or more TaskObservers for a default load mask bound to the tasks
     *   + the string 'onLoad' for a default load mask bound to the loading of the current model.
     */
    mask?: Some<TaskObserver>|ReactElement|boolean|'onLoad';

    /**
     * LoadingIndicator to render on this panel. Set to:
     *   + a ReactElement specifying a LoadingIndicator,
     *   + true for a default LoadingIndicator,
     *   + one or more TaskObservers for a default LoadingIndicator bound to the tasks
     *   + the string 'onLoad' for a default LoadingIndicator bound to the loading of the current model.
     */
    loadingIndicator?: Some<TaskObserver>|ReactElement|boolean|'onLoad';

    /** Allow the panel to scroll vertically */
    scrollable?: boolean;

    /** A toolbar to be docked at the top of the panel. */
    tbar?: Some<ReactNode>;

    /** Title text added to the panel's header. */
    title?: ReactNode;
}


/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 */
export const [Panel, panel] = hoistCmp.withFactory<PanelProps>({
    displayName: 'Panel',
    className: 'xh-panel',
    model: false,

    render(props, ref) {
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

        // 2) Set coreContents element based on scrollable.
        const coreContentsEl = scrollable ? div : vbox,
            coreContents = coreContentsEl({
                className: 'xh-panel__content',
                items: children
            });

        // 3) Prepare combined layout.
        return vbox({
            className: classNames(className, scrollable ? 'xh-panel--scrollable' : null),
            items: [
                panelHeader({title, icon, headerItems}),
                parseToolbar(tbar),
                coreContents,
                parseToolbar(bbar),
                parseLoadDecorator(maskProp, 'mask', contextModel),
                parseLoadDecorator(loadingIndicatorProp, 'loadingIndicator', contextModel)
            ],
            ref,
            ...rest,
            ...layoutProps
        });
    }
});


//------------------------
// Implementation
//------------------------
function parseLoadDecorator(prop, name, contextModel) {
    const cmp: ElemFactory = (name === 'mask' ? mask : loadingIndicator);
    if (!prop)                                  return null;
    if (prop === true)                          return cmp({isDisplayed: true});
    if (isValidElement(prop))                   return prop;
    if (prop === 'onLoad') {
        const loadModel = contextModel?.loadModel;
        if (!loadModel) {
            console.warn(`Cannot use 'onLoad' for '${name}'.  Context model does not implement loading.`);
            return null;
        }
        return cmp({bind: loadModel, spinner: true});
    }
    return cmp({bind: prop, spinner: true});
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}
