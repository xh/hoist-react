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

export interface SpinnerProps extends HoistProps {
    /** True to return a smaller spinner suitable for inline/compact use. */
    compact?: boolean;
    /** FA icon name to use. Default set via Spinner.iconName ('circle-notch'). */
    iconName?: IconName;
    /** FA icon prefix/weight. Default set via Spinner.prefix ('far'). */
    prefix?: HoistIconPrefix;
    /** FA animation prop to apply. Default set via Spinner.animation ('spin'). */
    animation?: 'spin' | 'spinPulse' | 'pulse' | 'beat' | 'beatFade' | 'bounce' | 'shake' | 'fade';
    /** True to use legacy animated PNG images. Default set via Spinner.usePng (false). */
    usePng?: boolean;
}

/**
 * An animated spinner rendered via a FontAwesome icon with a CSS animation. Used for the
 * platform-specific `Mask` and `LoadingIndicator` components.
 *
 * The icon, animation, and legacy PNG fallback can be configured per-instance via props or
 * globally via static defaults on the `Spinner` class (e.g. in app Bootstrap.ts):
 *
 * ```ts
 * Spinner.iconName = 'spinner-third';
 * Spinner.prefix = 'far';
 * Spinner.animation = 'spinPulse';
 * Spinner.usePng = true;  // fall back to animated PNG
 * ```
 */
export const [Spinner, spinner] = hoistCmp.withFactory<SpinnerProps>({
    displayName: 'Spinner',
    className: 'xh-spinner',
    model: false,
    observer: false,

    render({compact, className, ...props}) {
        const iconName: IconName = props.iconName ?? (Spinner as any).iconName,
            prefix = props.prefix ?? (Spinner as any).prefix,
            animation = props.animation ?? (Spinner as any).animation,
            usePng = props.usePng ?? (Spinner as any).usePng;

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

(function (Spinner: any) {
    /** FA icon name for the spinner. Override in app Bootstrap.ts. */
    Spinner.iconName = 'spinner-third';
    /** FA icon prefix/weight. Override in app Bootstrap.ts. */
    Spinner.prefix = 'fal';
    /** FA animation to apply. Override in app Bootstrap.ts. */
    Spinner.animation = 'spin';
    /** Set to true to use legacy animated PNG images instead of FA icons. */
    Spinner.usePng = false;
})(Spinner);
