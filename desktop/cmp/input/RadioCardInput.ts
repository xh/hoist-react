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
import {isNumber, isObject} from 'lodash';
import type {KeyboardEvent, ReactNode} from 'react';
import './RadioCardInput.scss';

export interface RadioCardInputProps extends HoistProps, HoistInputProps, LayoutProps {
    /**
     * Width of every card, in pixels or any CSS width. Cards in a group always share one width
     * and wrap onto new rows as needed. Defaults to the `--radio-card-input-card-width` CSS var
     * (88px), which suits short labels under a small preview. Set a wider value for longer labels
     * or descriptions - text wraps within the card.
     */
    cardWidth?: number | string;

    /**
     * True to stretch cards to fill each row, with `cardWidth` as their minimum width. Default
     * false, which keeps cards at `cardWidth` and aligned in columns across rows.
     */
    fill?: boolean;

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
 *
 * Sizing: every card in a group shares one width - `cardWidth`, default 88px - and cards wrap onto
 * new rows when they run out of room. Labels and descriptions wrap within the card. Raise
 * `cardWidth` for longer text, or set `fill` to stretch cards across the full row.
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
        // Leave modified keys (e.g. Alt+Left for Back) and keys typed within a card's preview
        // content to the browser and that content.
        const target = e.target as HTMLElement;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (!target.classList.contains('xh-radio-card-input__card')) return;

        const {enabledOptions, normalizedOptions, cardEls} = this;
        if (!enabledOptions.length) return;

        const currIdx = enabledOptions.indexOf(normalizedOptions[cardEls.indexOf(target)]),
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
        cardEls[normalizedOptions.indexOf(next)]?.focus();
        this.selectOption(next);
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
        {cardWidth, fill, id, tabIndex = 0, testId, domAttrs} = props;

    return div({
        className: classNames(className, fill && 'xh-radio-card-input--fill'),
        id,
        role: 'radiogroup',
        // FormField renders its label with an id derived from the input's id - see FormField.
        'aria-labelledby': id ? `${id}-label` : null,
        'aria-disabled': isDisabled || null,
        ref,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        onKeyDown: model.onKeyDown,
        style: {
            ...getLayoutProps(props),
            ...(cardWidth != null
                ? {
                      '--xh-radio-card-input-card-width': isNumber(cardWidth)
                          ? `${cardWidth}px`
                          : cardWidth
                  }
                : null)
        },
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
                'aria-disabled': cardDisabled || null,
                // Roving tab stop - disabled cards take no tabIndex so a click cannot focus them.
                tabIndex: cardDisabled ? null : opt === tabStopOption ? tabIndex : -1,
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
