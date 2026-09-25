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
import {banner, BannerProps} from '@xh/hoist/mobile/cmp/banner';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray, isString, omitBy} from 'lodash';
import {cloneElement, isValidElement, ReactNode, ReactElement} from 'react';
import {panelHeader} from './impl/PanelHeader';
import './Panel.scss';
import {logWarn} from '@xh/hoist/utils/js';

export interface PanelProps extends HoistProps, Omit<BoxProps, 'title'> {
    /**
     * One or more banners to show within the panel, for info, warning, or error states that
     * apply to its contents. Set to a {@link PanelBannerSpec}, a message string for a default
     * 'primary' banner, or a ReactElement. Banners render between the top toolbar and the
     * panel's contents by default - set `position: 'bottom'` on a spec to show above the bottom
     * toolbar instead. Null entries are ignored, supporting conditional banners.
     */
    banner?: Some<PanelBannerSpec | string | ReactElement>;

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

/** Config for a banner shown via {@link PanelProps.banner}. */
export interface PanelBannerSpec extends BannerProps {
    /** Where to show the banner - above (default) or below the panel's contents. */
    position?: 'top' | 'bottom';
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
            banner: bannerProp,
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
        const banners = parseBanners(bannerProp);
        return vbox({
            className,
            items: [
                panelHeader({title, icon, className: headerClassName, headerItems}),
                parseToolbar(tbar),
                ...banners.top,
                frame({
                    display: scrollable ? 'block' : 'flex',
                    ...contentBoxProps,
                    className: classNames('xh-panel__content', contentBoxProps?.className),
                    flexDirection: contentBoxProps?.flexDirection ?? 'column',
                    overflowY: scrollable ? 'auto' : contentBoxProps?.overflowY,
                    items: children
                }),
                ...banners.bottom,
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

function parseBanners(propVal: PanelProps['banner']) {
    const ret = {top: [], bottom: []};
    castArray(propVal).forEach(spec => {
        if (!spec) return;
        if (isValidElement<BannerProps>(spec)) {
            ret.top.push(cloneElement(spec, {className: bannerClass(spec.props.className, 'top')}));
            return;
        }
        const {
            position = 'top',
            className,
            ...rest
        }: PanelBannerSpec = isString(spec) ? {message: spec} : (spec as PanelBannerSpec);
        ret[position].push(banner({...rest, className: bannerClass(className, position)}));
    });
    return ret;
}

function bannerClass(className: string, position: 'top' | 'bottom') {
    return classNames(className, 'xh-panel__banner', `xh-panel__banner--${position}`);
}

function parseToolbar(barSpec) {
    return barSpec instanceof Array ? toolbar(barSpec) : barSpec || null;
}
