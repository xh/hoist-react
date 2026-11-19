/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    HoistInputProps,
    OptionPrimitive,
    SegmentedControlNullOption,
    SegmentedControlOption
} from '@xh/hoist/cmp/input';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import type {HoistProps, Intent} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {computed} from '@xh/hoist/mobx';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {filter, isObject} from 'lodash';
import type {FC, KeyboardEvent, ReactElement, ReactNode} from 'react';
import {createElement as h, useRef} from 'react';
import './SegmentedControl.scss';

export interface SegmentedControlProps extends HoistProps, HoistInputProps {
    /** True to render in a compact mode with reduced sizing for space-constrained contexts. */
    compact?: boolean;

    /**
     * True (default) to render all segments at an equal width when {@link fill} is enabled,
     * dividing the available width into equal parts regardless of label length - the conventional
     * segmented-control appearance. Set false to instead size each segment to its content and
     * share only the leftover space, so a longer label yields a wider segment. No effect when
     * `fill` is false.
     */
    equalSegmentWidths?: boolean;

    /**
     * True (default) to stretch the control to fill available width. Set false to size the control
     * to its options. See `equalSegmentWidths` for how the filled width is divided up.
     */
    fill?: boolean;

    /**
     * Default visual intent applied to the selected option, and as a subtle text-color hint
     * to options when not selected. Serves as the default for any option that does not specify
     * its own `intent`. Defaults to `'none'`.
     */
    intent?: 'none' | Intent;

    /**
     * Array of available options. Each entry may be a SegmentedControlOption object
     * with value/label/icon/disabled properties, or a primitive value used as both
     * the value and the display label.
     */
    options: Array<SegmentedControlOption | SegmentedControlNullOption | OptionPrimitive>;

    /**
     * True (default) to render a border around the control tray. Border color follows the current
     * intent. Note this controls the tray border only - it does not remove the tray background,
     * which is governed independently by `showTrayBackground`.
     */
    outlined?: boolean;

    /**
     * True (default) to fill the control tray with a background, setting it off from the surface
     * behind it. Set false to omit that fill for a lighter presentation.
     */
    showTrayBackground?: boolean;

    /**
     * True to render dividers between options, adding internal structure to the tray. Dividers
     * are suppressed on either side of the selected option so they do not compete with it.
     * Defaults to 'auto', showing dividers only while no option is selected - the state in which
     * the tray offers no other cue that its options are separate and selectable.
     */
    showOptionDividers?: boolean | 'auto';
}

/**
 * An input for selecting a single value from a small set of mutually exclusive options,
 * rendered as a group of toggle buttons with clear visual indication of the active
 * selection.
 *
 * Similar to ButtonGroupInput but driven by an `options` prop (like Select/RadioInput)
 * rather than Button children, and with stronger visual differentiation between selected
 * and unselected states.
 */
export const [SegmentedControl, segmentedControl] = hoistCmp.withFactory<SegmentedControlProps>({
    displayName: 'SegmentedControl',
    className: 'xh-segmented-control',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SegmentedControlModel);
    }
});
(SegmentedControl as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------

interface NormalizedOption extends SegmentedControlOption {
    label: string;
    intent?: Intent;
    testId?: string;
    _key: string;
}

class SegmentedControlModel extends HoistInputModel {
    override xhImpl = true;

    @computed
    get normalizedOptions(): NormalizedOption[] {
        const options = this.componentProps.options ?? [];
        return options.map((o: any, idx: number) => {
            const key = String(idx);
            if (isObject(o)) {
                const {label, value, icon, disabled, intent, testId} = o as SegmentedControlOption;
                return {
                    value: this.toInternal(value),
                    label: label ?? (icon ? '' : String(value)),
                    icon,
                    disabled,
                    intent,
                    testId,
                    _key: key
                };
            } else {
                return {value: this.toInternal(o), label: String(o), _key: key};
            }
        });
    }

    /**
     * Key of the option matching the current render value, or null if no option matches -
     * including whenever the bound value is itself null.
     */
    @computed
    get selectedKey(): string | null {
        const {renderValue, normalizedOptions} = this;
        return normalizedOptions.find(o => o.value === renderValue)?._key ?? null;
    }

    get enabledButtons(): HTMLButtonElement[] {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, (b: HTMLButtonElement) => !b.disabled) as HTMLButtonElement[];
    }

    onValueChange = (key: string) => {
        const match = this.normalizedOptions.find(o => o._key === key);
        if (match) this.noteValueChange(match.value);
    };

    override blur() {
        this.enabledButtons.forEach(it => it.blur());
    }

    override focus() {
        this.enabledButtons[0]?.focus();
    }
}

const cmp = hoistCmp.factory<SegmentedControlModel>(({model, className, ...props}, ref) => {
    const {
        // HoistInput props - exclude from passthrough to the segments
        bind,
        disabled,
        onChange,
        onCommit,
        tabIndex,
        value,
        commitOnChange,
        // Consumed by model
        options,
        // Consumed by this component
        compact,
        equalSegmentWidths = true,
        fill = true,
        intent,
        outlined = true,
        showTrayBackground = true,
        showOptionDividers = 'auto',
        testId,
        domAttrs,
        // Remainder passed to the segments
        ...segmentProps
    } = getNonLayoutProps(props);

    // 'auto' dividers track the empty state - shown only while nothing is selected.
    const dividers = showOptionDividers === 'auto' ? model.selectedKey == null : showOptionDividers;

    // Resolve the effective intent per option (own intent wins over control-level default),
    // applied via a per-button className that our SCSS keys its solid/hint coloring off of.
    const defaultIntent = intent && intent !== 'none' ? intent : null,
        segmentOptions = model.normalizedOptions.map(opt => {
            const optIntent = opt.intent ?? defaultIntent,
                optTestId = opt.testId ?? (testId ? `${testId}-${String(opt.value)}` : null);
            return {
                value: opt._key,
                label: opt.label,
                icon: opt.icon,
                disabled: opt.disabled,
                className: optIntent ? `xh-segmented-control-option--${optIntent}` : null,
                ...(optTestId ? {[TEST_ID]: optTestId} : null)
            };
        });

    return div({
        className: classNames(
            className,
            compact && 'xh-segmented-control--compact',
            fill && 'xh-segmented-control--fill',
            fill && equalSegmentWidths && 'xh-segmented-control--equal-widths',
            defaultIntent && `xh-segmented-control--${defaultIntent}`,
            outlined && 'xh-segmented-control--outlined',
            !showTrayBackground && 'xh-segmented-control--no-tray-bg',
            dividers && 'xh-segmented-control--dividers'
        ),
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        ...getLayoutProps(props),
        [TEST_ID]: props.testId,
        ...domAttrs,
        children: h(SegmentedControlImpl, {
            ...segmentProps,
            fill,
            size: compact ? 'small' : undefined,
            options: segmentOptions,
            value: model.selectedKey,
            onValueChange: model.onValueChange,
            disabled
        })
    });
});

//------------------------
// Segments
//------------------------
interface SegmentSpec {
    value: string;
    label?: ReactNode;
    icon?: ReactElement;
    disabled?: boolean;
    className?: string;
    [attr: string]: any;
}

interface SegmentedControlImplProps {
    options: SegmentSpec[];
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    fill?: boolean;
    inline?: boolean;
    size?: 'small';
    [attr: string]: any;
}

/**
 * The segments, as a radio group of buttons. Arrow keys move the selection, and only the selected
 * segment is in the tab order. Renders the same elements and class names as Blueprint's
 * `SegmentedControl`, so its styles and any app CSS keyed to them still apply.
 */
const SegmentedControlImpl: FC<SegmentedControlImplProps> = ({
    options,
    value,
    onValueChange,
    disabled,
    fill,
    inline,
    size,
    ...rest
}) => {
    const groupRef = useRef<HTMLDivElement>(null),
        isAnySelected = options.some(it => it.value === value);

    const onKeyDown = (e: KeyboardEvent) => {
        const direction = ['ArrowLeft', 'ArrowUp'].includes(e.key)
            ? -1
            : ['ArrowRight', 'ArrowDown'].includes(e.key)
              ? 1
              : 0;
        const focused = (document.activeElement as HTMLElement)?.closest('button');
        if (!direction || !focused) return;
        const buttons = Array.from(
                groupRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            ),
            idx = buttons.indexOf(focused);
        if (idx < 0) return;
        e.preventDefault();
        const next = buttons[(idx + direction + buttons.length) % buttons.length];
        next.click();
        next.focus();
    };

    return h(
        'div',
        {
            ...rest,
            ref: groupRef,
            role: 'radiogroup',
            onKeyDown,
            className: classNames('bp6-segmented-control', {
                'bp6-fill': fill,
                'bp6-inline': inline
            })
        },
        ...options.map(
            ({value: optValue, label, icon, disabled: optDisabled, className, ...attrs}, idx) => {
                const isSelected = optValue === value,
                    isDisabled = optDisabled || disabled,
                    text = label ?? optValue;
                return h(
                    'button',
                    {
                        ...attrs,
                        key: optValue,
                        type: 'button',
                        role: 'radio',
                        'aria-checked': isSelected,
                        tabIndex:
                            !isDisabled && (isSelected || (idx === 0 && !isAnySelected)) ? 0 : -1,
                        disabled: isDisabled,
                        className: classNames(
                            'bp6-button',
                            {
                                'bp6-disabled': isDisabled,
                                'bp6-small': size === 'small',
                                'bp6-minimal': !isSelected
                            },
                            className
                        ),
                        onClick: () => onValueChange(optValue)
                    },
                    icon ?? null,
                    text == null || text === ''
                        ? null
                        : h('span', {className: 'bp6-button-text'}, text)
                );
            }
        )
    );
};
