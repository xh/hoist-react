/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DateRangePickerModel} from '@xh/hoist/cmp/daterange';
import {
    DateRangePickerLocalModel,
    type DateRangePickerTabSpec
} from './impl/DateRangePickerLocalModel';
import {box, div, filler, fragment, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {
    hoistCmp,
    type HoistProps,
    type Intent,
    type LayoutProps,
    type TestSupportProps,
    useLocalModel,
    uses
} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import type {PopoverPosition} from '@blueprintjs/core';
import {elemWithin, getTestId} from '@xh/hoist/utils/js';
import {composeRefs, splitLayoutProps, useOnResize} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import type {KeyboardEvent, ReactNode} from 'react';
import {customTab} from './impl/CustomTab';
import {periodTab} from './impl/PeriodTab';
import {presetsTab} from './impl/PresetsTab';
import {relativeTab} from './impl/RelativeTab';
import './DateRangePicker.scss';

export interface DateRangePickerProps
    extends HoistProps<DateRangePickerModel>, LayoutProps, TestSupportProps {
    /**
     * Props forwarded to the trigger button - use to customize its `icon`, `intent`, `minimal`,
     * `outlined`, `tooltip`, or any other {@link ButtonProps}.
     */
    buttonProps?: Partial<ButtonProps>;

    /**
     * Text rendered in the popover footer, or null to suppress. Default is a note on the date that
     * periods are relative to. Not shown by a single-tab picker, whose footer carries the resolved
     * dates instead.
     */
    footerNote?: ReactNode;

    /**
     * Intent for the popover's selection accent - the highlight on selected presets, months,
     * and calendar days, and the Apply button. Also applied to the trigger button unless
     * overridden via `buttonProps`. Default: the primary intent for the accent, none for the
     * trigger.
     */
    intent?: Intent;

    /**
     * Placement of the popover relative to the trigger. Default 'bottom-left', which flips to
     * 'top-left' when there is no room below - e.g. from a bottom toolbar - and holds the popover's
     * left edge to the trigger as the trigger's label changes width.
     */
    popoverPosition?: PopoverPosition;

    /**
     * True (default) to show the resolved dates beside the period label on the trigger. The dates
     * are also dropped automatically when a stretched trigger (e.g. `flex: 1` within a narrow
     * dashboard widget) measures too narrow to fit them - either way, they remain available via
     * the trigger's tooltip.
     */
    showRange?: boolean;

    /**
     * True to flank the trigger with previous/next buttons that move the applied range by its own
     * length - see {@link DateRangePickerModel.stepRange}. Default false.
     */
    showStepButtons?: boolean;

    /**
     * True (default) to style trigger button background and borders to match inputs. Set to
     * false to render an outlined button instead.
     */
    styleButtonAsInput?: boolean;
}

/**
 * A dropdown control for selecting a period of time - one compact trigger that can express
 * presets (e.g. MTD, Prev 30 Days), relative lookbacks, calendar months, quarters and years, and
 * custom ranges of dates.
 *
 * The trigger shows the applied period's label with its resolved dates, and opens a popover with a
 * tab for each of those selection shapes. The backing {@link DateRangePickerModel}'s `tabs` config
 * selects which tabs show. Preset and period picks commit on click. Relative and custom picks are
 * drafts until Apply, held in a local model that never touches the applied value.
 *
 * App code constructs and persists the {@link DateRangePickerModel}, which owns the applied value
 * and the ranges and filters it resolves to - see that class for the full API.
 *
 * @see DateRangePickerModel
 */
export const [DateRangePicker, dateRangePicker] = hoistCmp.withFactory<DateRangePickerProps>({
    displayName: 'DateRangePicker',
    model: uses(DateRangePickerModel),
    className: 'xh-date-range-picker',

    render(
        {
            model,
            className,
            buttonProps,
            footerNote,
            intent,
            popoverPosition = 'bottom-left',
            showRange = true,
            showStepButtons = false,
            styleButtonAsInput = true,
            testId,
            ...props
        },
        ref
    ) {
        const impl = useLocalModel(() => new DateRangePickerLocalModel(testId, TAB_SPECS)),
            [layoutProps] = splitLayoutProps(props),
            {singleTab} = impl,
            // A stretched trigger adapts to its measured width - a content-sized toolbar trigger
            // never truncates, so it is not measured at all.
            {flex, width} = layoutProps,
            stretched =
                (flex != null && flex !== 0 && flex !== '0' && flex !== 'none') || width != null,
            compact = stretched && impl.measuredWidth != null && impl.measuredWidth < 280,
            resizeRef = useOnResize(rect => (impl.measuredWidth = rect.width), {debounce: 100}),
            viewRef = stretched ? composeRefs(impl.viewRef, resizeRef) : impl.viewRef;

        impl.intent = intent;

        return box({
            className: classNames(className, compact && 'xh-date-range-picker--compact'),
            ref: ref ? composeRefs(ref, viewRef) : viewRef,
            ...layoutProps,
            items: [
                stepButton({
                    omit: !showStepButtons,
                    model: impl,
                    steps: -1,
                    styleButtonAsInput,
                    testId
                }),
                popover({
                    isOpen: impl.isOpen,
                    position: popoverPosition,
                    minimal: false,
                    popoverClassName: classNames(
                        'xh-date-range-picker-popover',
                        singleTab && 'xh-date-range-picker-popover--single',
                        intent && `xh-date-range-picker-popover--intent-${intent}`
                    ),
                    item: trigger({
                        model: impl,
                        testId,
                        intent,
                        showRange: showRange && !compact,
                        styleButtonAsInput,
                        buttonProps
                    }),
                    content: popoverContent({model: impl, testId, intent, footerNote}),
                    onInteraction: (willOpen, e) => {
                        if (!willOpen && impl.isOpen) {
                            // Clicks on this instance's own trigger toggle via its onClick - don't
                            // double-close. Anything else, including this picker's own step
                            // buttons, closes the popover so it never shows drafts seeded from a
                            // stale value.
                            const target = e?.target as HTMLElement,
                                onTrigger =
                                    target && elemWithin(target, 'xh-date-range-picker__trigger');
                            if (!onTrigger) impl.close();
                        }
                    }
                }),
                stepButton({
                    omit: !showStepButtons,
                    model: impl,
                    steps: 1,
                    styleButtonAsInput,
                    testId
                })
            ]
        });
    }
});

//------------------
// Step buttons
//------------------
const stepButton = hoistCmp.factory<DateRangePickerLocalModel>(
    ({model, steps, styleButtonAsInput, testId}) => {
        const {parentModel} = model,
            back = steps < 0;
        return button({
            className: 'xh-date-range-picker__step-btn',
            icon: back ? Icon.angleLeft() : Icon.angleRight(),
            ...(styleButtonAsInput ? {minimal: true} : {outlined: true}),
            title: back ? 'Previous period' : 'Next period',
            disabled: back ? !parentModel.canStepBack : !parentModel.canStepForward,
            testId: getTestId(testId, back ? 'step-back' : 'step-forward'),
            onClick: () => parentModel.stepRange(steps)
        });
    }
);

//------------------
// Trigger
//------------------
const trigger = hoistCmp.factory<DateRangePickerLocalModel>(
    ({model, testId, intent, showRange, styleButtonAsInput, buttonProps}) => {
        const {parentModel} = model,
            {label, rangeLabel, labelNeedsDates} = parentModel,
            // Without its dates, `Custom` or `As Of` says nothing - show the dates in their place.
            text = !showRange && labelNeedsDates ? rangeLabel : label,
            base = 'xh-date-range-picker__trigger';

        return button({
            // Input mode relies on the `--as-input` class for its chrome, so renders minimal.
            ...(styleButtonAsInput ? {minimal: true} : {outlined: true}),
            intent,
            icon: Icon.calendar(),
            title: `${label} | ${rangeLabel}`,
            ...buttonProps,
            className: classNames(
                base,
                styleButtonAsInput && `${base}--as-input`,
                buttonProps?.className
            ),
            active: model.isOpen,
            testId: getTestId(testId, 'trigger'),
            items: [
                span({className: `${base}-label`, item: text}),
                span({omit: !showRange, className: `${base}-divider`, item: '|'}),
                span({omit: !showRange, className: `${base}-range`, item: rangeLabel})
            ],
            onClick: () => model.toggleOpen(),
            // Arrow keys step the period without opening the popover.
            onKeyDown: (e: KeyboardEvent) => {
                const steps = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
                if (steps) {
                    e.preventDefault();
                    parentModel.stepRange(steps);
                }
            }
        });
    }
);

//------------------
// Popover shell
//------------------
const popoverContent = hoistCmp.factory<DateRangePickerLocalModel>(
    ({model, testId, intent, footerNote}) => {
        return vbox({
            className: 'xh-date-range-picker-popover__content',
            testId: getTestId(testId, 'popover'),
            onKeyDown: e => {
                // Enter applies the active draft - except on buttons, whose Enter is their click.
                const onButton = !!(e.target as HTMLElement).closest('button');
                if (e.key === 'Enter' && model.applyEnabled && !onButton) model.apply();
            },
            items: [
                tabContainer({
                    className: 'xh-date-range-picker-popover__body',
                    model: model.tabModel,
                    // Switcher testId seeds each tab's own - `<testId>-rail-<tabId>`.
                    switcher: model.singleTab
                        ? false
                        : {orientation: 'left', testId: getTestId(testId, 'rail')}
                }),
                footer({model, testId, intent, footerNote})
            ]
        });
    }
);

//------------------
// Footer
//------------------
const footer = hoistCmp.factory<DateRangePickerLocalModel>(
    ({model, testId, intent, footerNote}) => {
        const {parentModel, singleTab} = model,
            // Explicit null suppresses the note; undefined takes the default.
            note = footerNote === undefined ? anchorNote({model}) : footerNote,
            showNote = !singleTab && note != null && note !== false,
            // Apply and Cancel only where there is a draft to apply - presets and periods commit
            // on click, and drafts commit as they change under `commitOnChange`.
            showControls = model.showApplyControls && model.applyEnabled;

        // A single tab with nothing to apply - or that applies as it changes - needs no buttons.
        if (singleTab && !showControls) {
            return div({
                className: 'xh-date-range-picker-popover__single-footer',
                item: parentModel.rangeLabel
            });
        }

        if (!showNote && !showControls) return null;

        return hbox({
            className: 'xh-date-range-picker-popover__footer',
            items: [
                Icon.info({
                    omit: !showNote,
                    className: 'xh-date-range-picker-popover__footer-icon'
                }),
                div({
                    omit: !showNote,
                    className: 'xh-date-range-picker-popover__footer-note',
                    item: note
                }),
                filler(),
                button({
                    omit: !showControls,
                    text: 'Cancel',
                    testId: getTestId(testId, 'cancel'),
                    onClick: () => model.close()
                }),
                button({
                    omit: !showControls,
                    text: 'Apply',
                    outlined: true,
                    intent: intent ?? 'primary',
                    testId: getTestId(testId, 'apply'),
                    onClick: () => model.apply()
                })
            ]
        });
    }
);

/** The default footer note - muted prose, with the date it names set apart as on the trigger. */
const anchorNote = hoistCmp.factory<DateRangePickerLocalModel>(({model}) => {
    const {prefix, date} = model.anchorNote;
    return fragment(
        prefix,
        span({className: 'xh-date-range-picker-popover__footer-date', item: date})
    );
});

//------------------
// Tabs
//------------------
/** Switcher entry + content for each tab. The model's `tabs` config selects and orders them. */
const TAB_SPECS: DateRangePickerTabSpec[] = [
    {id: 'presets', title: 'Presets', icon: Icon.bolt(), content: presetsTab},
    {id: 'relative', title: 'Relative', icon: Icon.history(), content: relativeTab},
    {id: 'period', title: 'Months & Years', icon: Icon.calendarDays(), content: periodTab},
    {id: 'custom', title: 'Custom Range', icon: Icon.calendarRange(), content: customTab}
];
