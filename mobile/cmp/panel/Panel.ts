/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {frame, vbox} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    TaskObserver,
    useContextModel,
    Some,
    HoistProps,
    ElementFactory,
    hoistCmp,
    HoistModel
} from '@xh/hoist/core';
import {loadingIndicator} from '@xh/hoist/cmp/loadingindicator';
import {mask} from '@xh/hoist/cmp/mask';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {omitBy} from 'lodash';
import {isValidElement, ReactNode, ReactElement} from 'react';
import {panelHeader} from './impl/PanelHeader';
import './Panel.scss';
import {logWarn} from '@xh/hoist/utils/js';

export interface PanelProps extends HoistProps, Omit<BoxProps, 'title'> {
    /** A toolbar to be docked at the bottom of the panel. */
    bbar?: ReactNode;

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

    /** Additional props to pass to the inner frame hosting child `items`. */
    contentBoxProps?: BoxProps;

    /** Allow the panel content area to scroll vertically. */
    scrollable?: boolean;

    /** A toolbar to be docked at the top of the panel. */
    tbar?: ReactNode;

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
            contentBoxProps,
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

        // 2) Prepare combined layout.
        return vbox({
            className,
            items: [
                panelHeader({title, icon, className: headerClassName, headerItems}),
                parseToolbar(tbar),
                frame({
                    display: scrollable ? 'block' : 'flex',
                    ...contentBoxProps,
                    className: classNames('xh-panel__content', contentBoxProps?.className),
                    flexDirection: contentBoxProps?.flexDirection ?? 'column',
                    overflowY: scrollable ? 'auto' : contentBoxProps?.overflowY,
                    items: children
                }),
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
        const loadObserver = ctxModel?.loadObserver;
        if (!loadObserver) {
            logWarn(
                `Cannot use 'onLoad' for '${propName}'. The linked context model (${ctxModel?.constructor.name} ${ctxModel?.xhId}) must enable LoadSupport to support this feature.`,
                Panel
            );
            return null;
        }
        return cmp({bind: loadObserver, spinner: true});
    }
    return cmp({bind: propVal, spinner: true});
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}
