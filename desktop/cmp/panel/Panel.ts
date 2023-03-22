/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {box, frame, vbox, vframe} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    HoistProps,
    refreshContextView,
    Some,
    TaskObserver,
    useContextModel,
    uses,
    hoistCmp
} from '@xh/hoist/core';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {useContextMenu, useHotkeys} from '@xh/hoist/desktop/hooks';
import '@xh/hoist/desktop/register';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {castArray, omitBy} from 'lodash';
import {Children, isValidElement, ReactElement, ReactNode, useLayoutEffect, useRef} from 'react';
import {modalSupport} from '../modalsupport/ModalSupport';
import {panelHeader} from './impl/PanelHeader';
import {resizeContainer} from './impl/ResizeContainer';
import './Panel.scss';
import {PanelModel} from './PanelModel';
import {HotkeyConfig} from '@xh/hoist/kit/blueprint';
import {ContextMenuSpec} from '../contextmenu/ContextMenu';

export interface PanelProps extends HoistProps<PanelModel>, Omit<BoxProps, 'title'> {
    /** True to style panel header (if displayed) with reduced padding and font-size. */
    compactHeader?: boolean;

    /** Items to be added to the right-side of the panel's header. */
    headerItems?: ReactNode[];

    /** An icon placed at the left-side of the panel's header. */
    icon?: ReactElement;

    /** Context Menu to show on context clicking this panel. */
    contextMenu?: ContextMenuSpec;

    /**
     * Specification of hotkeys as prescribed by blueprint.
     * @see useHotkeys() for more information on accepted values for this prop.
     */
    hotkeys?: HotkeyConfig[];

    /**
     * LoadingIndicator to render on this panel. Set to:
     *   + a ReactElement specifying a LoadingIndicator,
     *   + true for a default LoadingIndicator,
     *   + one or more tasks for a default LoadingIndicator bound to the tasks
     *   + the string 'onLoad' for a default LoadingIndicator bound to the loading of the current model.
     */
    loadingIndicator?: Some<TaskObserver> | ReactElement | boolean | 'onLoad';

    /**
     * Mask to render on this panel. Set to:
     *   + a ReactElement specifying a Mask instance,
     *   + true for a default mask,
     *   + one or more tasks for a default load mask bound to the tasks
     *   + the string 'onLoad' for a default load mask bound to the loading of the current model.
     */
    mask?: Some<TaskObserver> | ReactElement | boolean | 'onLoad';

    /**
     * A toolbar to be docked at the top of the panel.
     * If specified as an array, items will be passed as children to a Toolbar component.
     */
    tbar?: Some<ReactNode>;

    /**
     * A toolbar to be docked at the top of the panel.
     * If specified as an array, items will be passed as children to a Toolbar component.
     */
    bbar?: Some<ReactNode>;

    /** Title text added to the panel's header. */
    title?: ReactNode;
}

/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 *
 * Panels also support resizing and collapsing their contents via its `model` prop. Provide an
 * optional `PanelModel` config as a prop to enable and customize these features.
 *
 * A Panel will accept a ref argument to provide access to its top level DOM element.
 */
export const [Panel, panel] = hoistCmp.withFactory<PanelProps>({
    displayName: 'Panel',
    model: uses(PanelModel, {
        fromContext: false,
        publishMode: 'limited',
        createDefault: () => new PanelModel({collapsible: false, resizable: false, xhImpl: true})
    }),
    className: 'xh-panel',

    render({model, className, ...props}, ref) {
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

        useLayoutEffect(() => {
            model.enforceSizeLimits();
        });

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
            renderMode,
            vertical,
            showSplitter,
            refreshContextModel,
            modalSupportModel
        } = model;

        if (collapsed) {
            delete layoutProps[`min${vertical ? 'Height' : 'Width'}`];
            delete layoutProps[vertical ? 'height' : 'width'];
        }

        let coreContents = null;
        if (
            !collapsed ||
            renderMode === 'always' ||
            (renderMode === 'lazy' && wasDisplayed.current)
        ) {
            const parseToolbar = barSpec => {
                return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
            };

            coreContents = vframe({
                style: {display: collapsed ? 'none' : 'flex'},
                items: Children.toArray([
                    parseToolbar(tbar),
                    ...castArray(children),
                    parseToolbar(bbar)
                ])
            });
        }
        if (!collapsed) wasDisplayed.current = true;

        // decorate with hooks (internally conditional, of course)
        coreContents = useContextMenu(coreContents, contextMenu);
        coreContents = useHotkeys(coreContents, hotkeys);

        // 3) Prepare combined layout with header above core.  This is what layout props are trampolined to
        let item = vbox({
            className: 'xh-panel__content',
            items: [
                panelHeader({title, icon, compact: compactHeader, headerItems}),
                coreContents,
                parseLoadDecorator(maskProp, 'mask', contextModel),
                parseLoadDecorator(loadingIndicatorProp, 'loadingIndicator', contextModel)
            ],
            ...rest
        });

        if (refreshContextModel) {
            item = refreshContextView({model: refreshContextModel, item});
        }

        // 3) Wrap in modal support if needed.  Inner frame ensures className is still present in
        // DOM when rendered in Dialog
        if (modalSupportModel) {
            item = modalSupport({
                model: modalSupportModel,
                item: frame({
                    item,
                    className: model.isModal ? className : undefined
                })
            });
        }

        // 4) Return wrapped in resizable affordances if needed, or equivalent layout box
        item =
            resizable || collapsible || showSplitter
                ? resizeContainer({ref, item, className})
                : box({ref, item, className, ...layoutProps});

        return item;
    }
});

function parseLoadDecorator(prop, name, contextModel) {
    const cmp = (name === 'mask' ? mask : loadingIndicator) as any;
    if (!prop) return null;
    if (isValidElement(prop)) return prop;
    if (prop === true) return cmp({isDisplayed: true});
    if (prop === 'onLoad') {
        const loadModel = contextModel?.loadModel;
        if (!loadModel) {
            console.warn(
                `Cannot use 'onLoad' for '${name}' - the linked context model must enable LoadSupport to support this feature.`
            );
            return null;
        }
        return cmp({bind: loadModel, spinner: true});
    }
    return cmp({bind: prop, spinner: true});
}
