/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {elementFactory, hoistCmp, HoistProps, Intent} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {getTestId, TEST_ID} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {capitalize, filter, isEmpty} from 'lodash';
import {KeyboardEvent} from 'react';
import './IntentInput.scss';

export const INTENTS: Intent[] = ['primary', 'success', 'warning', 'danger'];

export interface IntentInputProps extends HoistProps, HoistInputProps {
    /** True to render in a compact mode with reduced sizing for space-constrained contexts. */
    compact?: boolean;

    /**
     * True to offer a null value, rendered as an additional outlined swatch ahead of the intents
     * and holding the check while the value is null. Defaults to false, leaving the control a
     * required single-select.
     */
    enableClear?: boolean;

    /**
     * Intents to offer, in render order. Defaults to all four Hoist intents - specify a subset
     * to restrict or reorder the available choices.
     */
    intents?: Intent[];

    /**
     * True to render each intent's name alongside its swatch. Defaults to false, for the most
     * compact presentation - note swatches always carry their intent name as a tooltip and as
     * their accessible label, so an unlabelled control remains identifiable.
     */
    showNames?: boolean;
}

/**
 * An input for selecting a Hoist Intent, rendered as a compact row of color swatches drawn in
 * the intent colors themselves. The selected swatch is marked with a check and a surrounding
 * ring; names can optionally be rendered alongside each swatch.
 *
 * Set `enableClear` to offer a null value, rendered as an additional outlined swatch ahead of
 * the intents.
 *
 * Designed to fit within a toolbar or a dense form without additional chrome. Swatches are
 * rendered as an ARIA radiogroup, supporting selection via click, enter/space, and arrow keys.
 */
export const [IntentInput, intentInput] = hoistCmp.withFactory<IntentInputProps>({
    displayName: 'IntentInput',
    className: 'xh-intent-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, IntentInputModel);
    }
});
(IntentInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
const buttonEl = elementFactory('button');

class IntentInputModel extends HoistInputModel {
    override xhImpl = true;

    @computed
    get intents(): Intent[] {
        const {intents} = this.componentProps;
        return isEmpty(intents) ? INTENTS : intents;
    }

    /**
     * Selectable values in render order - the offered intents, preceded by a null entry when
     * `enableClear` is set. Null is a value here like any other, so it selects, renders a check,
     * and takes part in keyboard nav without any special-casing.
     */
    @computed
    get options(): Intent[] {
        const {intents} = this;
        return this.componentProps.enableClear ? [null, ...intents] : intents;
    }

    get enabledButtons(): HTMLButtonElement[] {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, (b: HTMLButtonElement) => !b.disabled) as HTMLButtonElement[];
    }

    constructor() {
        super();
        makeObservable(this);
    }

    onSwatchClick = (intent: Intent) => {
        this.noteValueChange(intent);
    };

    /**
     * Arrow keys move the selection to the adjacent option, as expected of a radiogroup. Wraps
     * around at either end, and starts from the first option when the current value is not among
     * those offered.
     */
    onKeyDown = (e: KeyboardEvent) => {
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : null;
        if (delta == null) return;

        const {options, renderValue} = this,
            currIdx = options.indexOf(renderValue);

        e.preventDefault();

        const nextIdx = currIdx === -1 ? 0 : (currIdx + delta + options.length) % options.length;
        this.noteValueChange(options[nextIdx]);
        this.enabledButtons[nextIdx]?.focus();
    };

    override blur() {
        this.enabledButtons.forEach(it => it.blur());
    }

    override focus() {
        this.enabledButtons[0]?.focus();
    }
}

const cmp = hoistCmp.factory<IntentInputModel>(({model, className, ...props}, ref) => {
    const {
        // HoistInput props - exclude from passthrough to the container
        bind,
        disabled,
        onChange,
        onCommit,
        tabIndex,
        value,
        commitOnChange,
        // Consumed by model
        enableClear,
        intents,
        // Consumed by this component
        compact,
        showNames,
        testId,
        // Remainder passed to the container div
        ...rest
    } = getNonLayoutProps(props);

    const {renderValue} = model;

    return div({
        ...rest,
        className: classNames(
            className,
            compact && 'xh-intent-input--compact',
            showNames && 'xh-intent-input--with-names'
        ),
        ref,
        role: 'radiogroup',
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        onKeyDown: disabled ? null : model.onKeyDown,
        ...getLayoutProps(props),
        [TEST_ID]: testId,
        items: model.options.map(intent => {
            const isSelected = renderValue === intent,
                isNull = intent == null,
                name = isNull ? 'None' : capitalize(intent);

            return buttonEl({
                key: intent ?? 'none',
                type: 'button',
                className: classNames(
                    'xh-intent-input__swatch',
                    `xh-intent-input__swatch--${intent ?? 'none'}`,
                    isSelected && 'xh-intent-input__swatch--selected'
                ),
                role: 'radio',
                'aria-checked': isSelected,
                'aria-label': name,
                title: name,
                disabled,
                tabIndex,
                onClick: () => model.onSwatchClick(intent),
                [TEST_ID]: getTestId(testId, intent ?? 'none'),
                items: [
                    div({
                        className: 'xh-intent-input__swatch__fill',
                        // Check is always rendered, and hidden via `visibility` when unselected.
                        // Omitting it instead would change the swatch's baseline, which shifts
                        // baseline-aligned siblings (e.g. an inline FormField label) on every
                        // selection change - see the note in IntentInput.scss.
                        item: Icon.check({
                            className: classNames(
                                'xh-intent-input__swatch__check',
                                !isSelected && 'xh-intent-input__swatch__check--hidden'
                            )
                        })
                    }),
                    div({omit: !showNames, className: 'xh-intent-input__swatch__name', item: name})
                ]
            });
        })
    });
});
