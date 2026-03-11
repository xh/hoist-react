/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {bpSegmentedControl} from '@xh/hoist/kit/blueprint';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {filter, isObject} from 'lodash';
import {ReactElement} from 'react';
import './SegmentedControl.scss';

export interface SegmentedControlProps extends HoistProps, HoistInputProps {
    /** True to render in a compact mode with reduced sizing for space-constrained contexts. */
    compact?: boolean;

    /**
     * True (default) to stretch the control to fill available width,
     * distributing space equally among options.
     */
    fill?: boolean;

    /**
     * Visual intent applied to the selected option. Only `'primary'` is supported
     * (in addition to the default `'none'`).
     */
    intent?: 'none' | 'primary';

    /**
     * Array of available options. Each entry may be a SegmentedControlOption object
     * with value/label/icon/disabled properties, or a primitive value used as both
     * the value and the display label.
     */
    options: (SegmentedControlOption | any)[];
}

export interface SegmentedControlOption {
    /** Value for this option. */
    value: any;

    /** Display label. Defaults to `value.toString()` if omitted. */
    label?: string;

    /** Icon element, displayed before the label. */
    icon?: ReactElement;

    /** True to disable this individual option. */
    disabled?: boolean;
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
interface NormalizedOption extends SegmentedControlOption {
    label: string;
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
                const {label, value, icon, disabled} = o as SegmentedControlOption;
                return {
                    value: this.toInternal(value),
                    label: label ?? String(value),
                    icon,
                    disabled,
                    _key: key
                };
            } else {
                return {value: this.toInternal(o), label: String(o), _key: key};
            }
        });
    }

    /** Map the current render value to the string key used by the Blueprint control. */
    @computed
    get selectedKey(): string {
        const {renderValue, normalizedOptions} = this;
        return normalizedOptions.find(o => o.value === renderValue)?._key;
    }

    get enabledButtons(): HTMLButtonElement[] {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, (b: HTMLButtonElement) => !b.disabled) as HTMLButtonElement[];
    }

    constructor() {
        super();
        makeObservable(this);
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
        testId,
        // Remainder passed to BP SegmentedControl
        ...bpProps
    } = getNonLayoutProps(props);

    const bpOptions = model.normalizedOptions.map(opt => ({
        value: opt._key,
        label: opt.label,
        icon: opt.icon,
        disabled: opt.disabled
    }));

    return div({
        className: classNames(className, compact && 'xh-segmented-control--compact'),
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        ...getLayoutProps(props),
        [TEST_ID]: props.testId,
        item: bpSegmentedControl({
            ...bpProps,
            fill: bpProps.fill ?? true,
            size: compact ? 'small' : undefined,
            options: bpOptions,
            value: model.selectedKey,
            onValueChange: model.onValueChange,
            disabled
        })
    });
});
