/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
/// <reference path="../../assets.d.ts" />
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {img} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {HoistIconPrefix, Icon, IconProps} from '@xh/hoist/icon';
import {apiDeprecated} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {cloneElement, isValidElement, ReactElement} from 'react';
import compactSpinnerImg from './spinner-20px.png';
import spinnerImg from './spinner-50px.png';
import './Spinner.scss';

export interface SpinnerDefaults {
    icon?: string | ReactElement;
    /** @deprecated - use `icon` instead. Will be removed in v91. */
    iconName?: IconName;
    prefix?: HoistIconPrefix;
    usePng?: boolean;
}

export interface SpinnerProps extends HoistProps {
    /** True to return a smaller spinner suitable for inline/compact use. */
    compact?: boolean;
    /**
     * Icon to animate - a name resolved through the icon catalog, either an `Icon` name
     * (`'circleNotch'`) or an FA name (`'circle-notch'`), or an icon element such as
     * `Icon.circleNotch()`. A name the catalog does not know renders Hoist's default spinner.
     * Default set via `Spinner.defaults.icon`.
     */
    icon?: string | ReactElement;
    /** @deprecated - use `icon` instead. Will be removed in v91. */
    iconName?: IconName;
    /**
     * FA icon prefix/weight, for an icon given by name. Default set via `Spinner.defaults.prefix`.
     */
    prefix?: HoistIconPrefix;
    /** True to use legacy animated PNG images. Default set via `Spinner.defaults.usePng`. */
    usePng?: boolean;
}

/**
 * An animated spinner rendered via a FontAwesome icon with a CSS rotation animation. Used for
 * the platform-specific `Mask` and `LoadingIndicator` components.
 *
 * The rotation animation is applied via CSS on the `.xh-spinner` class rather than FA's
 * animation props, ensuring the spinner remains functional when the OS-level
 * `prefers-reduced-motion` preference is enabled (FA disables all its animations in that case).
 *
 * The icon and legacy PNG fallback can be configured per-instance via props or globally via
 * `Spinner.defaults` (e.g. in app Bootstrap.ts):
 *
 * ```ts
 * Spinner.defaults.icon = 'circleNotch';
 * Spinner.defaults.prefix = 'far';
 * Spinner.defaults.usePng = true;  // fall back to animated PNG
 * ```
 */
export const [Spinner, spinner] = hoistCmp.withFactory<SpinnerProps, SpinnerDefaults>({
    displayName: 'Spinner',
    className: 'xh-spinner',
    model: false,
    observer: false,
    defaults: {
        icon: 'spinnerThird',
        prefix: 'fal',
        usePng: false
    },
    render({compact, className, ...props}) {
        const {defaults} = Spinner,
            icon =
                props.icon ??
                deprecatedName(props.iconName, 'SpinnerProps.iconName') ??
                deprecatedName(defaults.iconName, 'Spinner.defaults.iconName') ??
                defaults.icon,
            prefix = props.prefix ?? defaults.prefix,
            size: IconProps['size'] = compact ? 'lg' : '3x',
            usePng = props.usePng ?? defaults.usePng;

        if (usePng) {
            const pxSize = compact ? '20px' : '50px';
            return img({
                src: compact ? compactSpinnerImg : spinnerImg,
                width: pxSize,
                height: pxSize,
                className
            });
        }

        // Animation is applied via CSS on .xh-spinner rather than FA's animation props,
        // which are disabled by FA's blanket prefers-reduced-motion override.
        if (isValidElement<{className?: string}>(icon)) {
            return cloneElement(icon, {
                className: classNames(icon.props.className, className),
                size
            } as any);
        }
        // Icon.get() warns on an unknown name - fall back so a mask never renders blank.
        const iconProps: IconProps = {prefix, className, size};
        return Icon.get(icon, iconProps) ?? Icon.spinnerThird(iconProps);
    }
});

function deprecatedName(name: IconName, api: string): IconName {
    if (name) apiDeprecated(api, {v: 'v91', msg: "Use 'icon' instead.", source: 'Spinner'});
    return name;
}
