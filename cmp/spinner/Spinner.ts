/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {IconName} from '@fortawesome/fontawesome-svg-core';
import {img} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {HoistIconPrefix, Icon} from '@xh/hoist/icon';
import compactSpinnerImg from './spinner-20px.png';
import spinnerImg from './spinner-50px.png';
import './Spinner.scss';

/** Animation type for FA spinner icons. */
export type SpinnerAnimation =
    | 'spin'
    | 'spinPulse'
    | 'pulse'
    | 'beat'
    | 'beatFade'
    | 'bounce'
    | 'shake'
    | 'fade';

export interface SpinnerDefaults {
    iconName?: IconName;
    prefix?: HoistIconPrefix;
    animation?: SpinnerAnimation;
    usePng?: boolean;
}

export interface SpinnerProps extends HoistProps {
    /** True to return a smaller spinner suitable for inline/compact use. */
    compact?: boolean;
    /** FA icon name to use. Default set via `Spinner.defaults.iconName`. */
    iconName?: IconName;
    /** FA icon prefix/weight. Default set via `Spinner.defaults.prefix`. */
    prefix?: HoistIconPrefix;
    /** FA animation prop to apply. Default set via `Spinner.defaults.animation`. */
    animation?: SpinnerAnimation;
    /** True to use legacy animated PNG images. Default set via `Spinner.defaults.usePng`. */
    usePng?: boolean;
}

/**
 * An animated spinner rendered via a FontAwesome icon with a CSS animation. Used for the
 * platform-specific `Mask` and `LoadingIndicator` components.
 *
 * The icon, animation, and legacy PNG fallback can be configured per-instance via props or
 * globally via `Spinner.defaults` (e.g. in app Bootstrap.ts):
 *
 * ```ts
 * Spinner.defaults.iconName = 'spinner-third';
 * Spinner.defaults.prefix = 'far';
 * Spinner.defaults.animation = 'spinPulse';
 * Spinner.defaults.usePng = true;  // fall back to animated PNG
 * ```
 */
export const [Spinner, spinner] = hoistCmp.withFactory<SpinnerProps>({
    displayName: 'Spinner',
    className: 'xh-spinner',
    model: false,
    observer: false,

    render({compact, className, ...props}) {
        const {defaults} = Spinner as any,
            iconName: IconName = props.iconName ?? defaults.iconName,
            prefix = props.prefix ?? defaults.prefix,
            animation = props.animation ?? defaults.animation,
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

        return Icon.icon({
            iconName,
            prefix,
            className,
            size: compact ? 'lg' : '3x',
            [animation]: true
        });
    }
});

/** App-level defaults for Spinner. Instance props take precedence. */
(Spinner as any).defaults = {
    iconName: 'spinner-third',
    prefix: 'fal',
    animation: 'spin',
    usePng: false
} as SpinnerDefaults;
