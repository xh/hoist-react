/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, Intent, LayoutProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {computed} from '@xh/hoist/mobx';
import {getTestId, TEST_ID} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isObject} from 'lodash';
import type {KeyboardEvent, ReactNode} from 'react';
import './RadioCardInput.scss';

export interface RadioCardInputProps extends HoistProps, HoistInputProps, LayoutProps {
    /** True to allow the selected card to be clicked again to clear the value. Default false. */
    enableClear?: boolean;

    /** Intent used to highlight the selected card. Defaults to 'primary'. */
    intent?: Intent;

    /**
     * Array of available options. Each entry may be a RadioCardOption object or a primitive
     * value used as both the value and the display label.
     */
    options: Array<RadioCardOption | string | number | boolean>;
}

export interface RadioCardOption {
    /** Value bound to the input when this card is selected. */
    value: any;

    /** Label shown beneath the preview. Defaults to the stringified value. */
    label?: ReactNode;

    /** Visual filling the top of the card - e.g. a mini mockup, type specimen, swatch, or icon. */
    preview?: ReactNode;

    /** Secondary text shown below the label. */
    description?: ReactNode;

    /** True to render this card as disabled and unselectable. */
    disabled?: boolean;
}

/**
 * An input for selecting a single value from a small set of options, each rendered as a card with
 * a visual preview and a label. The selected card is highlighted with an accent ring.
 *
 * Follows the common "radio cards" idiom - see the Appearance picker in macOS System Settings.
 * Use it when options are easier to show than to name: themes, fonts, layouts, chart types.
 * Prefer {@link SegmentedControl} or {@link RadioInput} for plain text options, and
 * {@link Select} for more than a handful of choices.
 *
 * Renders as an ARIA radio group: Tab moves focus to the group, and the arrow keys move focus
 * between cards and select them.
 */
export const [RadioCardInput, radioCardInput] = hoistCmp.withFactory<RadioCardInputProps>({
    displayName: 'RadioCardInput',
    className: 'xh-radio-card-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, RadioCardInputModel);
    }
});
(RadioCardInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
interface NormalizedOption extends RadioCardOption {
    label: ReactNode;
}

class RadioCardInputModel extends HoistInputModel {
    override xhImpl = true;

    @computed
    get normalizedOptions(): NormalizedOption[] {
        const options = this.componentProps.options ?? [];
        return options.map((o: any) => {
            if (isObject(o)) {
                const opt = o as RadioCardOption;
                return {
                    ...opt,
                    value: this.toInternal(opt.value),
                    label: opt.label ?? String(opt.value)
                };
            }
            return {value: this.toInternal(o), label: String(o)};
        });
    }

    get isDisabled(): boolean {
        return !!this.componentProps.disabled;
    }

    get enabledOptions(): NormalizedOption[] {
        return this.isDisabled ? [] : this.normalizedOptions.filter(o => !o.disabled);
    }

    /** The option that takes the group's single tab stop - the selected card, or the first. */
    get tabStopOption(): NormalizedOption {
        const {enabledOptions, renderValue} = this;
        return enabledOptions.find(o => o.value === renderValue) ?? enabledOptions[0];
    }

    get cardEls(): HTMLElement[] {
        const els = this.domEl?.querySelectorAll<HTMLElement>('.xh-radio-card-input__card');
        return els ? Array.from(els) : [];
    }

    selectOption(opt: NormalizedOption) {
        if (opt.disabled || this.isDisabled) return;
        const isActive = opt.value === this.renderValue;
        if (isActive && !this.componentProps.enableClear) return;
        this.noteValueChange(isActive ? null : opt.value);
    }

    onKeyDown = (e: KeyboardEvent) => {
        const {enabledOptions, normalizedOptions} = this;
        if (!enabledOptions.length) return;

        const currIdx = enabledOptions.findIndex(
                o => this.cardEls[normalizedOptions.indexOf(o)] === document.activeElement
            ),
            lastIdx = enabledOptions.length - 1;

        let nextIdx: number;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIdx = currIdx < lastIdx ? currIdx + 1 : 0;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIdx = currIdx > 0 ? currIdx - 1 : lastIdx;
                break;
            case 'Home':
                nextIdx = 0;
                break;
            case 'End':
                nextIdx = lastIdx;
                break;
            case ' ':
            case 'Enter':
                if (currIdx >= 0) {
                    e.preventDefault();
                    this.selectOption(enabledOptions[currIdx]);
                }
                return;
            default:
                return;
        }

        // Per the ARIA radio group pattern, arrow keys both move focus and select.
        e.preventDefault();
        const next = enabledOptions[nextIdx];
        this.cardEls[normalizedOptions.indexOf(next)]?.focus();
        if (next.value !== this.renderValue) this.noteValueChange(next.value);
    };

    //-----------------
    // Overrides
    //-----------------
    override blur() {
        this.cardEls.forEach(it => it.blur());
    }

    override focus() {
        const {tabStopOption, normalizedOptions} = this;
        if (tabStopOption) this.cardEls[normalizedOptions.indexOf(tabStopOption)]?.focus();
    }
}

const cmp = hoistCmp.factory<RadioCardInputModel>(({model, className, ...props}, ref) => {
    const {renderValue, normalizedOptions, tabStopOption, isDisabled} = model,
        {intent = 'primary', tabIndex = 0, testId, domAttrs} = props;

    return div({
        className: classNames(
            className,
            `xh-radio-card-input--${intent}`,
            isDisabled && 'xh-radio-card-input--disabled'
        ),
        role: 'radiogroup',
        'aria-disabled': isDisabled || undefined,
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        onKeyDown: model.onKeyDown,
        ...getLayoutProps(props),
        [TEST_ID]: testId,
        ...domAttrs,
        items: normalizedOptions.map((opt, idx) => {
            const isActive = opt.value === renderValue,
                cardDisabled = isDisabled || opt.disabled;

            return div({
                key: idx,
                className: classNames(
                    'xh-radio-card-input__card',
                    isActive && 'xh-radio-card-input__card--selected',
                    cardDisabled && 'xh-radio-card-input__card--disabled'
                ),
                role: 'radio',
                'aria-checked': isActive,
                'aria-disabled': cardDisabled || undefined,
                tabIndex: opt === tabStopOption ? tabIndex : -1,
                onClick: () => model.selectOption(opt),
                [TEST_ID]: getTestId(testId, String(opt.value)),
                items: [
                    opt.preview != null
                        ? div({className: 'xh-radio-card-input__preview', item: opt.preview})
                        : null,
                    div({className: 'xh-radio-card-input__label', item: opt.label}),
                    opt.description != null
                        ? div({
                              className: 'xh-radio-card-input__description',
                              item: opt.description
                          })
                        : null
                ]
            });
        })
    });
});
