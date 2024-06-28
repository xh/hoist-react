/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, vbox} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    TaskObserver,
    useContextModel,
    Some,
    ElementFactory,
    hoistCmp,
    HoistModel,
    HoistPropsWithRef
} from '@xh/hoist/core';
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
import {logWarn} from '@xh/hoist/utils/js';

export interface PanelProps extends HoistPropsWithRef<HTMLDivElement>, Omit<BoxProps, 'title'> {
    /** A toolbar to be docked at the bottom of the panel. */
    bbar?: Some<ReactNode>;

    /** CSS class name specific to the panel's header. */
    headerClassName?: string;

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
    mask?: Some<TaskObserver> | ReactElement | boolean | 'onLoad';

    /**
     * LoadingIndicator to render on this panel. Set to:
     *   + a ReactElement specifying a LoadingIndicator,
     *   + true for a default LoadingIndicator,
     *   + one or more TaskObservers for a default LoadingIndicator bound to the tasks
     *   + the string 'onLoad' for a default LoadingIndicator bound to the loading of the current model.
     */
    loadingIndicator?: Some<TaskObserver> | ReactElement | boolean | 'onLoad';

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
            headerClassName,
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
        const coreContentsEl = scrollable ? div : (vbox as ElementFactory),
            coreContents = coreContentsEl({
                className: 'xh-panel__content',
                items: children
            });

        // 3) Prepare combined layout.
        return vbox({
            className: classNames(className, scrollable ? 'xh-panel--scrollable' : null),
            items: [
                panelHeader({title, icon, className: headerClassName, headerItems}),
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
function parseLoadDecorator(propVal: any, propName: string, ctxModel: HoistModel) {
    const cmp = (propName === 'mask' ? mask : loadingIndicator) as ElementFactory;
    if (!propVal) return null;
    if (propVal === true) return cmp({isDisplayed: true});
    if (isValidElement(propVal)) return propVal;
    if (propVal === 'onLoad') {
        const loadModel = ctxModel?.loadModel;
        if (!loadModel) {
            logWarn(
                `Cannot use 'onLoad' for '${propName}'. The linked context model (${ctxModel?.constructor.name} ${ctxModel?.xhId}) must enable LoadSupport to support this feature.`,
                Panel
            );
            return null;
        }
        return cmp({bind: loadModel, spinner: true});
    }
    return cmp({bind: propVal, spinner: true});
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}
