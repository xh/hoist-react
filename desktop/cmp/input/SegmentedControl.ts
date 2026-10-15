/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistInputModel,
    HoistInputProps,
    OptionPrimitive,
    SegmentedControlNullOption,
    SegmentedControlOption,
    useHoistInputModel
} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, Intent, LayoutProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {bpSegmentedControl} from '@xh/hoist/kit/blueprint';
import {computed} from '@xh/hoist/mobx';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {filter, isObject} from 'lodash';
import './SegmentedControl.scss';

export interface SegmentedControlProps extends HoistProps, HoistInputProps, LayoutProps {
    /** True to render in a compact mode with reduced sizing for space-constrained contexts. */
    compact?: boolean;

    /**
     * True (default) to render all segments at an equal width - the conventional segmented-control
     * appearance. A control sized to its content gives every segment the width of its widest
     * label. A control sized by layout props divides that width equally. Set false to size each
     * segment to its own label, sharing any extra width among them.
     */
    equalSegmentWidths?: boolean;

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
 *
 * Sized to its options by default - it does not stretch to fill its container. Size it with
 * layout props, as for any other component: `flex: 1` to fill the rest of a row such as a
 * toolbar, or `width` for a fixed or percentage width (e.g. `width: '100%'` in a column).
 * A desktop `FormField` passes `flex: 1` to an input with no `width` or `flex` of its own, which
 * stretches the control in some field layouts. Set `flex: 'none'` or a `width` to fix its size.
 *
 * Built on Blueprint's SegmentedControl component.
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

/**
 * Key handed to the Blueprint control when no option is selected. Option keys are always
 * `String(index)`, so this cannot collide with a real option - and unlike a nullish value, it
 * keeps Blueprint from falling back to its own internal selection state. See usage note below.
 */
const NO_SELECTION_KEY = '__xh_no_selection__';

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
     * including whenever the bound value is itself null. Note this is the model's own view of
     * the selection: the key actually handed to Blueprint is resolved at its point of use below.
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
        // HoistInput props - exclude from passthrough to BP
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
        intent,
        outlined = true,
        showTrayBackground = true,
        showOptionDividers = 'auto',
        testId,
        domAttrs,
        // Remainder passed to BP SegmentedControl
        ...bpProps
    } = getNonLayoutProps(props);

    // 'auto' dividers track the empty state - shown only while nothing is selected.
    const dividers = showOptionDividers === 'auto' ? model.selectedKey == null : showOptionDividers;

    // Resolve the effective intent per option (own intent wins over control-level default),
    // applied via a per-button className that our SCSS keys its solid/hint coloring off of.
    const defaultIntent = intent && intent !== 'none' ? intent : null,
        bpOptions = model.normalizedOptions.map(opt => {
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
            equalSegmentWidths && 'xh-segmented-control--equal-widths',
            defaultIntent && `xh-segmented-control--${defaultIntent}`,
            outlined && 'xh-segmented-control--outlined',
            !showTrayBackground && 'xh-segmented-control--no-tray-bg',
            dividers && 'xh-segmented-control--dividers'
        ),
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        style: getLayoutProps(props),
        [TEST_ID]: props.testId,
        ...domAttrs,
        item: bpSegmentedControl({
            ...bpProps,
            // The tray always fills this component's root element, which takes the control's
            // size - from its content by default, or from any layout props.
            fill: true,
            size: compact ? 'small' : undefined,
            options: bpOptions,
            // Blueprint resolves its selection as `value ?? internalState`, where the internal
            // state is set on every click even when controlled. Passing a nullish value for a
            // selection matching no option would fall back to the last-clicked segment,
            // leaving it highlighted after the bound value is cleared. Pass a sentinel key
            // instead, keeping the control fully controlled - Blueprint handles a value matching
            // no option natively (see `isAnySelected`) and emits no warning.
            value: model.selectedKey ?? NO_SELECTION_KEY,
            onValueChange: model.onValueChange,
            disabled
        })
    });
});
