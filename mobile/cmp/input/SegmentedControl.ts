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
import {hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, Intent} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {TEST_ID} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {filter, isObject} from 'lodash';
import './SegmentedControl.scss';

export interface SegmentedControlProps extends HoistProps, HoistInputProps {
    /**
     * True (default) to render all segments at an equal width when {@link fill} is enabled,
     * dividing the available width into equal parts regardless of label length - the conventional
     * segmented-control appearance. Set false to instead size each segment to its content and
     * share only the leftover space, so a longer label yields a wider segment. No effect when
     * `fill` is false. Either way, a label too wide for its segment truncates with an ellipsis.
     */
    equalSegmentWidths?: boolean;

    /**
     * True (default) to stretch the control to fill available width,
     * distributing space equally among options.
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
     * True to render with an outlined style - a border around the control tray
     * with no inner background fill. Border color follows the current intent.
     */
    outlined?: boolean;
}

/**
 * An input for selecting a single value from a small set of mutually exclusive options,
 * rendered as a group of toggle buttons with clear visual indication of the active
 * selection.
 *
 * Similar to ButtonGroupInput but driven by an `options` prop (like Select) rather than Button
 * children, and with stronger visual differentiation between selected and unselected states.
 * The mobile counterpart to the desktop SegmentedControl, built on Hoist's mobile Button
 * (no Blueprint dependency).
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
                const {label, value, icon, disabled, intent} = o as SegmentedControlOption;
                return {
                    value: this.toInternal(value),
                    label: label ?? (icon ? '' : String(value)),
                    icon,
                    disabled,
                    intent,
                    _key: key
                };
            } else {
                return {value: this.toInternal(o), label: String(o), _key: key};
            }
        });
    }

    /** Map the current render value to the string key used to identify the selected option. */
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
        // HoistInput props - consumed here or by the model, not passed to the tray
        bind,
        disabled,
        onChange,
        onCommit,
        tabIndex,
        value,
        commitOnChange,
        options,
        // Consumed by this component
        equalSegmentWidths = true,
        fill = true,
        intent,
        outlined,
        testId,
        ...rest
    } = getNonLayoutProps(props);

    const {selectedKey} = model,
        defaultIntent = intent && intent !== 'none' ? intent : null;

    const buttons = model.normalizedOptions.map(opt => {
        const optIntent = opt.intent ?? defaultIntent,
            selected = opt._key === selectedKey;
        // Wrap the label so it can truncate with an ellipsis when the segment is too narrow,
        // rather than hard-clipping mid-character. Pass null for icon-only options so the Button
        // renders the icon alone (an empty span would suppress that).
        const label = opt.label
            ? span({className: 'xh-segmented-control-option__label', item: opt.label})
            : null;

        return button({
            key: opt._key,
            text: label,
            icon: opt.icon,
            disabled: disabled || opt.disabled,
            minimal: true,
            className: classNames(
                'xh-segmented-control-option',
                selected && 'xh-segmented-control-option--selected',
                optIntent && `xh-segmented-control-option--${optIntent}`
            ),
            onClick: () => model.onValueChange(opt._key)
        });
    });

    return hbox({
        className: classNames(
            className,
            defaultIntent && `xh-segmented-control--${defaultIntent}`,
            outlined && 'xh-segmented-control--outlined',
            fill && 'xh-segmented-control--fill',
            fill && equalSegmentWidths && 'xh-segmented-control--equal-widths'
        ),
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        ...getLayoutProps(props),
        [TEST_ID]: testId,
        items: buttons,
        ...rest
    });
});
