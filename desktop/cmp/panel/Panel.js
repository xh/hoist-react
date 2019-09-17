/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useState} from 'react';
import PT from 'prop-types';
import {castArray, omitBy} from 'lodash';
import {hoistCmp, uses} from '@xh/hoist/core';
import {vbox, vframe} from '@xh/hoist/cmp/layout';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {isReactElement, splitLayoutProps} from '@xh/hoist/utils/react';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {panelHeader} from './impl/PanelHeader';
import {resizeContainer} from './impl/ResizeContainer';
import {PanelModel} from './PanelModel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {contextMenuHost} from '@xh/hoist/desktop/cmp/contextmenu';
import {hotkeysHost} from '@xh/hoist/desktop/cmp/hotkeys';

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
        toContext: false,
        createDefault: () => new PanelModel({collapsible: false, resizable: false})
    }),
    memo: false,
    className: 'xh-panel',

    render({model, ...props}, ref) {
        let [flags] = useState({wasDisplayed: true}),
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
        if (!collapsed || collapsedRenderMode == 'always' || (collapsedRenderMode == 'lazy' && flags.wasDisplayed)) {
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

            // Wrap with functionality-only boxes
            if (contextMenu) {
                coreContents = contextMenuHost({contextMenu, item: coreContents});
            }
            if (hotkeys) {
                coreContents = hotkeysHost({hotkeys, item: coreContents});
            }
        }
        if (!collapsed) flags.wasDisplayed = true;

        // 3) Prepare combined layout with header above core.  This is what layout props are trampolined to
        const processedPanelHeader = (title || icon || headerItems) ?
            panelHeader({model, title, icon, compact: compactHeader, headerItems}) :
            null;


        const item = vbox({
            ref: !requiresContainer ? ref : undefined,
            items: [
                processedPanelHeader,
                coreContents,
                parseLoadDecorator(maskProp, mask),
                parseLoadDecorator(loadingIndicatorProp, loadingIndicator)
            ],
            ...rest,
            ...layoutProps
        });

        // 4) Return, wrapped in resizable and its affordances if needed.
        return requiresContainer ?
            resizeContainer({model, ref, item}) :
            item;
    }
});

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


Panel.propTypes = {
    /** True to style panel header (if displayed) with reduced padding and font-size. */
    compactHeader: PT.bool,

    /** Items to be added to the right-side of the panel's header. */
    headerItems: PT.node,

    /** An icon placed at the left-side of the panel's header. */
    icon: PT.element,

    /**
     * Array of ContextMenuItems, configs to create them, Elements, or '-' (divider).  Or a function
     * that receives the triggering event and returns such an array.
     * A value of null will result in no value being shown. A ContextMenu element may also be returned.
     */
    contextMenu: PT.oneOfType([PT.func, PT.array, PT.node]),

    /**
     * An array of hotkeys, or configs for hotkeys, as prescribed by blueprint.
     * A value of null will result in no keys being registered.
     */
    hotkeys: PT.oneOfType([PT.func, PT.array, PT.node]),

    /**
     * Message to render unobtrusively on panel corner. Set to:
     *   + a PendingTaskModel for an indicator w/spinner bound to that model (most common), or
     *   + a ReactElement specifying a LoadingIndicator instance, or
     *   + true for a default LoadingIndicator.
     */
    loadingIndicator: PT.oneOfType([PT.instanceOf(PendingTaskModel), PT.element, PT.bool]),

    /**
     * Mask to render on this panel. Set to:
     *   + a PendingTaskModel for a mask w/spinner bound to that model (most common), or
     *   + a ReactElement specifying a Mask instance - or -
     *   + true for a default mask.
     */
    mask: PT.oneOfType([PT.instanceOf(PendingTaskModel), PT.element, PT.bool]),

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