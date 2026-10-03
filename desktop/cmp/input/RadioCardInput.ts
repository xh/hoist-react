/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {computed} from '@xh/hoist/mobx';
import {getTestId, TEST_ID, throwIf} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isObject} from 'lodash';
import type {KeyboardEvent, ReactNode} from 'react';
import './RadioCardInput.scss';

export interface RadioCardInputProps extends HoistProps, HoistInputProps, LayoutProps {
    /**
     * Fixed width for every card, in pixels or any CSS width. Labels wrap to fit and wider
     * previews are clipped. By default each card sizes to its own content, between the
     * `--radio-card-input-min-width-px` and `--radio-card-input-max-width-px` CSS vars, so cards
     * in one group can differ in width.
     */
    cardWidth?: number | string;

    /**
     * Array of available options. Each entry may be a RadioCardOption object or a primitive
     * value used as both the value and the display label. To let users pick "no value", include
     * an option with a null value and a label such as "None" - a selected card cannot be cleared
     * by clicking it again.
     */
    options: Array<RadioCardOption | string | number | boolean>;
}

export interface RadioCardOption {
    /** Value bound to the input when this card is selected. May be null for a "None" option. */
    value: any;

    /** Label shown beneath the preview. Defaults to the stringified value. Required if null. */
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
                throwIf(
                    opt.value == null && opt.label == null,
                    'RadioCardInput options with a null value must declare a label.'
                );
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
        if (opt.value !== this.renderValue) this.noteValueChange(opt.value);
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
        {cardWidth, tabIndex = 0, testId, domAttrs} = props,
        cardStyle =
            cardWidth != null ? {width: cardWidth, minWidth: 0, maxWidth: 'none'} : undefined;

    return div({
        className: classNames(className, isDisabled && 'xh-radio-card-input--disabled'),
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
                    opt.preview != null && 'xh-radio-card-input__card--with-preview',
                    cardDisabled && 'xh-radio-card-input__card--disabled'
                ),
                role: 'radio',
                'aria-checked': isActive,
                'aria-disabled': cardDisabled || undefined,
                // Roving tab stop - disabled cards take no tabIndex so a click cannot focus them.
                tabIndex: cardDisabled ? undefined : opt === tabStopOption ? tabIndex : -1,
                style: cardStyle,
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
