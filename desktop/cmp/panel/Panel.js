/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useRef, isValidElement} from 'react';
import PT from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {hoistCmp, uses, useContextModel, ModelPublishMode} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {useContextMenu, useHotkeys} from '@xh/hoist/desktop/hooks';
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
 * A Panel will accept a ref argument to provide access to its top level DOM element.
 *
 * @see PanelModel
 */
export const [Panel, panel] = hoistCmp.withFactory({
    displayName: 'Panel',
    model: uses(PanelModel, {
        fromContext: false,
        publishMode: ModelPublishMode.LIMITED,
        createDefault: () => new PanelModel({collapsible: false, resizable: false})
    }),
    memo: false,
    className: 'xh-panel',

    render({model, ...props}, ref) {

        const contextModel = useContextModel('*');

        let wasDisplayed = useRef(false),
            [layoutProps, nonLayoutProps] = splitLayoutProps(props);

        const {
            tbar,
            bbar,
            title,
            icon,
            compactHeader,
            headerItems,
            mask: maskProp,
            loadingIndicator: loadingIndicatorProp,
            contextMenu,
            hotkeys,
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

        // 2) Prepare 'core' contents according to collapsed state
        const {
            resizable,
            collapsible,
            collapsed,
            collapsedRenderMode,
            vertical,
            showSplitter
        } = model;

        const requiresContainer = resizable || collapsible || showSplitter;

        if (collapsed) {
            delete layoutProps[`min${vertical ? 'Height' : 'Width'}`];
            delete layoutProps[vertical ? 'height' : 'width'];
        }

        let coreContents = null;
        if (!collapsed || collapsedRenderMode == 'always' || (collapsedRenderMode == 'lazy' && wasDisplayed.current)) {
            const parseToolbar = (barSpec) => {
                return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
            };

            coreContents = vframe({
                style: {display: collapsed ? 'none' : 'flex'},
                items: [
                    parseToolbar(tbar),
                    ...(castArray(children)),
                    parseToolbar(bbar)
                ]
            });
        }
        if (!collapsed) wasDisplayed.current = true;

        // decorate with hooks (internally conditional, of course)
        coreContents = useContextMenu(coreContents, contextMenu);
        coreContents = useHotkeys(coreContents, hotkeys);

        // 3) Prepare combined layout with header above core.  This is what layout props are trampolined to
        const processedPanelHeader = (title || icon || headerItems) ?
            panelHeader({title, icon, compact: compactHeader, headerItems}) :
            null;


        const item = vbox({
            ref: !requiresContainer ? ref : undefined,
            items: [
                processedPanelHeader,
                coreContents,
                parseLoadDecorator(maskProp, 'mask', contextModel),
                parseLoadDecorator(loadingIndicatorProp, 'loadingIndicator', contextModel)
            ],
            ...rest,
            ...layoutProps
        });

        // 4) Return, wrapped in resizable and its affordances if needed.
        return requiresContainer ?
            resizeContainer({ref, item}) :
            item;
    }
});

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

Panel.propTypes = {
    /** True to style panel header (if displayed) with reduced padding and font-size. */
    compactHeader: PT.bool,

    /** Items to be added to the right-side of the panel's header. */
    headerItems: PT.node,

    /** An icon placed at the left-side of the panel's header. */
    icon: PT.element,

    /**
     * Specification of a context menu.
     *  @see useContextMenu() for more information on accepted values for this prop.
     */
    contextMenu: PT.oneOfType([PT.func, PT.array, PT.node]),

    /**
     * Specification of hotkeys as prescribed by blueprint.
     * @see useHotkeys() for more information on accepted values for this prop.
     */
    hotkeys: PT.oneOfType([PT.array, PT.node]),

    /**
     * LoadingIndicator to render on this panel. Set to:
     *   + a ReactElement specifying a LoadingIndicator,
     *   + true for a default LoadingIndicator,
     *   + a PendingTaskModel for a default LoadingIndicator bound to a pending task,
     *   + the string 'onLoad' for a default LoadingIndicator bound to the loading of the current model.
     *     (current model must include @LoadSupport).
     */
    loadingIndicator: PT.oneOfType([PT.instanceOf(PendingTaskModel), PT.element, PT.bool, PT.string]),

    /**
     * Mask to render on this panel. Set to:
     *   + a ReactElement specifying a Mask instance,
     *   + true for a default mask,
     *   + a PendingTaskModel for a default load mask bound to a pending task,
     *   + the string 'onLoad' for a default load mask bound to the loading of the current model.
     *     (current model must include @LoadSupport).
     */
    mask: PT.oneOfType([PT.instanceOf(PendingTaskModel), PT.element, PT.bool, PT.string]),

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(PanelModel), PT.object]),

    /**
     * A toolbar to be docked at the top of the panel.
     * If specified as an array, items will be passed as children to a Toolbar component.
     */
    tbar: PT.oneOfType([PT.element, PT.array]),

    /**
     * A toolbar to be docked at the top of the panel.
     * If specified as an array, items will be passed as children to a Toolbar component.
     */
    bbar: PT.oneOfType([PT.element, PT.array]),

    /** Title text added to the panel's header. */
    title: PT.oneOfType([PT.string, PT.node])
};