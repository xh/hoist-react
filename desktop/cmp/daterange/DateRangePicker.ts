/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    DATE_RANGE_UNITS,
    DateRangePickerModel,
    getDateRangePresetName,
    getDateRangeUnitLabel
} from '@xh/hoist/cmp/daterange';
import {
    DateRangePickerLocalModel,
    type DateRangePickerTabSpec
} from '@xh/hoist/cmp/daterange/impl/DateRangePickerLocalModel';
import {box, div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
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
import {dateInput, numberInput, segmentedControl} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {controlGroup, popover} from '@xh/hoist/kit/blueprint';
import type {PopoverPosition} from '@blueprintjs/core';
import type {LocalDate} from '@xh/hoist/utils/datetime';
import {elemWithin, getTestId, TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, splitLayoutProps, useOnResize} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import type {KeyboardEvent, ReactNode} from 'react';
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
     * periods resolve against, shown while the Presets or Relative tab is active. Not shown by
     * a single-tab picker, whose footer carries the resolved dates instead.
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
 * presets (e.g. MTD, Last 30 Days), relative lookbacks, calendar months and years, and custom
 * ranges of dates.
 *
 * The trigger shows the applied period's label with its resolved dates, and opens a popover with a
 * tab for each of those selection shapes. The backing {@link DateRangePickerModel}'s `tabs` config
 * selects which tabs show. Preset and month/year picks commit on click. Relative and custom picks
 * are drafts until Apply, held in a local model that never touches the applied value.
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

const sectionHeader = (text: string) =>
    div({className: 'xh-date-range-picker-popover__section-hdr', item: text});

//------------------
// Tab - Presets
//------------------
const presetsTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, singleTab} = model,
        {value, context} = parentModel;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            sectionHeader('Presets'),
            ...parentModel.presets.map(preset => {
                const {token} = preset,
                    selected = value.kind === 'preset' && value.token === token,
                    range = parentModel.resolve({kind: 'preset', token}).current;
                return div({
                    key: token,
                    className: classNames(
                        'xh-date-range-picker-popover__preset-row',
                        selected && 'xh-date-range-picker-popover__preset-row--selected'
                    ),
                    ...dataAttrs({[TEST_ID]: getTestId(testId, `preset-${token}`)}),
                    ...clickable(() => model.commit({kind: 'preset', token})),
                    items: [
                        Icon.check({
                            className: classNames(
                                'xh-date-range-picker-popover__row-check',
                                !selected && 'xh-date-range-picker-popover__row-check--hidden'
                            )
                        }),
                        span({
                            className: 'xh-date-range-picker-popover__row-name',
                            item: getDateRangePresetName(preset, context)
                        }),
                        span({
                            omit: singleTab,
                            className: 'xh-date-range-picker-popover__row-range',
                            item: parentModel.fmtRange(range)
                        })
                    ]
                });
            })
        ]
    });
});

//------------------
// Tab - Relative
//------------------
const relativeTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, relativeRange} = model;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            sectionHeader('Relative Lookback'),
            hbox({
                className: 'xh-date-range-picker-popover__rel-row',
                items: [
                    span({className: 'xh-date-range-picker-popover__rel-last', item: 'Last'}),
                    controlGroup({
                        items: [
                            button({
                                text: '−',
                                minWidth: 20,
                                testId: getTestId(testId, 'count-down'),
                                onClick: () => model.stepCount(-1)
                            }),
                            numberInput({
                                model,
                                bind: 'relativeCount',
                                min: 1,
                                max: 999,
                                width: 56,
                                textAlign: 'center',
                                commitOnChange: true,
                                testId: getTestId(testId, 'count')
                            }),
                            button({
                                text: '+',
                                minWidth: 20,
                                testId: getTestId(testId, 'count-up'),
                                onClick: () => model.stepCount(1)
                            })
                        ]
                    }),
                    segmentedControl({
                        model,
                        bind: 'relativeUnit',
                        testId: getTestId(testId, 'unit'),
                        options: DATE_RANGE_UNITS.map(unit => ({
                            value: unit,
                            label: getDateRangeUnitLabel(unit)
                        }))
                    })
                ]
            }),
            div({
                className: 'xh-date-range-picker-popover__snap-box',
                items: [
                    // Two ways of counting, named as peers - a checkbox would frame one as a
                    // modifier on the other, inviting the read that it widens the range. Days have
                    // nothing to round out, so offer no choice at that grain.
                    segmentedControl({
                        omit: !model.snapApplies,
                        model,
                        bind: 'relativeSnap',
                        fill: false,
                        testId: getTestId(testId, 'snap'),
                        options: [
                            {value: false, label: 'Rolling'},
                            {value: true, label: 'Calendar'}
                        ]
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__snap-help',
                        item: model.relativeModeHelpText
                    })
                ]
            }),
            div({
                className: 'xh-date-range-picker-popover__preview',
                items: [
                    div({
                        className: 'xh-date-range-picker-popover__preview-label',
                        item: 'Resolves To'
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__preview-range',
                        item: parentModel.fmtRange(relativeRange)
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__preview-days',
                        item: model.relativePreviewCountText
                    })
                ]
            })
        ]
    });
});

//------------------
// Tab - Months & Years
//------------------
const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];

const monthYearTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, gridYear} = model,
        {value} = parentModel,
        yearRange = parentModel.resolve({kind: 'year', year: gridYear}).current,
        yearSelected = value.kind === 'year' && value.year === gridYear;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            hbox({
                className: 'xh-date-range-picker-popover__month-hdr',
                items: [
                    sectionHeader('Months & Years'),
                    filler(),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleLeft(),
                        minimal: true,
                        disabled: !model.canYearBack,
                        testId: getTestId(testId, 'year-back'),
                        onClick: () => model.stepYear(-1)
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__year-val',
                        item: String(gridYear)
                    }),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleRight(),
                        minimal: true,
                        disabled: !model.canYearForward,
                        testId: getTestId(testId, 'year-forward'),
                        onClick: () => model.stepYear(1)
                    })
                ]
            }),
            div({
                className: 'xh-date-range-picker-popover__month-grid',
                items: MONTH_LABELS.map((label, idx) => {
                    const month = idx + 1,
                        active =
                            value.kind === 'month' &&
                            value.month === month &&
                            value.year === gridYear;
                    return button({
                        key: label,
                        className: 'xh-date-range-picker-popover__month-btn',
                        text: label,
                        // Selected reads as a solid accent fill, like the unit selector's
                        // selected segment. Unselected keeps the outlined treatment used
                        // elsewhere in the picker - note Hoist buttons are minimal by default,
                        // so a solid fill needs `minimal: false`, not just `outlined: false`.
                        outlined: !active,
                        minimal: !active,
                        active,
                        intent: active ? (model.intent ?? 'primary') : undefined,
                        disabled: model.isMonthDisabled(month),
                        testId: getTestId(testId, `month-${month}`),
                        onClick: () => model.commit({kind: 'month', year: gridYear, month})
                    });
                })
            }),
            button({
                className: 'xh-date-range-picker-popover__year-row',
                outlined: !yearSelected,
                minimal: !yearSelected,
                active: yearSelected,
                intent: yearSelected ? (model.intent ?? 'primary') : undefined,
                disabled: !model.yearSelectable,
                testId: getTestId(testId, 'year-row'),
                onClick: () => model.commit({kind: 'year', year: gridYear}),
                items: [
                    Icon.calendar(),
                    span({
                        className: 'xh-date-range-picker-popover__year-row-label',
                        item: model.yearRowLabel
                    }),
                    span({
                        // As on the Presets tab - the single-tab popover is too narrow for dates.
                        omit: model.singleTab,
                        className: 'xh-date-range-picker-popover__row-range',
                        item: parentModel.fmtRange(yearRange)
                    })
                ]
            })
        ]
    });
});

//------------------
// Tab - Custom
//------------------
const customTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, minDate, maxDate, leftMonth, rightMonth} = model;

    const field = (edge: 'start' | 'end') =>
        vbox({
            className: classNames(
                'xh-date-range-picker-popover__field',
                model.nextEdge === edge && 'xh-date-range-picker-popover__field--armed'
            ),
            items: [
                div({
                    className: 'xh-date-range-picker-popover__field-label',
                    item: edge === 'start' ? 'Start' : 'End'
                }),
                dateInput({
                    value: edge === 'start' ? model.customStart : model.customEnd,
                    onCommit: v =>
                        edge === 'start' ? model.commitStartInput(v) : model.commitEndInput(v),
                    valueType: 'localDate',
                    formatString: parentModel.dateFormat,
                    enablePicker: false,
                    rightElement: null,
                    width: '100%',
                    minDate,
                    maxDate,
                    testId: getTestId(testId, `${edge}-input`)
                })
            ]
        });

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            hbox({
                className: 'xh-date-range-picker-popover__custom-fields',
                items: [
                    field('start'),
                    Icon.arrowRight({className: 'xh-date-range-picker-popover__field-arrow'}),
                    field('end')
                ]
            }),
            hbox({
                className: 'xh-date-range-picker-popover__cal-nav',
                items: [
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleLeft(),
                        minimal: true,
                        disabled: !model.canCalBack,
                        testId: getTestId(testId, 'cal-back'),
                        onClick: () => model.stepCalendar(-1)
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__cal-title',
                        item: leftMonth.format('MMMM YYYY')
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__cal-title',
                        item: rightMonth.format('MMMM YYYY')
                    }),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleRight(),
                        minimal: true,
                        disabled: !model.canCalForward,
                        testId: getTestId(testId, 'cal-forward'),
                        onClick: () => model.stepCalendar(1)
                    })
                ]
            }),
            hbox({
                className: 'xh-date-range-picker-popover__cals',
                items: [
                    calendarMonth({model, monthStart: leftMonth}),
                    calendarMonth({model, monthStart: rightMonth})
                ]
            })
        ]
    });
});

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarMonthProps extends HoistProps<DateRangePickerLocalModel> {
    monthStart: LocalDate;
}

const calendarMonth = hoistCmp.factory<CalendarMonthProps>(({model, monthStart}) => {
    const {customStart, customEnd} = model;

    return div({
        className: 'xh-date-range-picker-popover__cal',
        items: [
            div({
                className: 'xh-date-range-picker-popover__cal-dow',
                items: DOW_LABELS.map((it, idx) => span({key: idx, item: it}))
            }),
            ...buildWeeks(monthStart).map((week, wIdx) =>
                div({
                    key: wIdx,
                    className: 'xh-date-range-picker-popover__cal-week',
                    items: week.map((day, dIdx) => {
                        if (!day) {
                            return div({
                                key: dIdx,
                                className: 'xh-date-range-picker-popover__cal-cell'
                            });
                        }
                        const disabled = model.isDayDisabled(day),
                            edge = day === customStart || day === customEnd,
                            inRange = day > customStart && day < customEnd;
                        return div({
                            key: dIdx,
                            className: classNames(
                                'xh-date-range-picker-popover__cal-cell',
                                edge && 'xh-date-range-picker-popover__cal-cell--edge',
                                inRange && 'xh-date-range-picker-popover__cal-cell--in-range',
                                disabled && 'xh-date-range-picker-popover__cal-cell--disabled'
                            ),
                            ...dataAttrs({'data-date': day.isoString}),
                            item: day.format('D'),
                            ...clickable(disabled ? null : () => model.pickDay(day))
                        });
                    })
                })
            )
        ]
    });
});

function buildWeeks(monthStart: LocalDate): (LocalDate | null)[][] {
    const startOffset = monthStart.moment.day(),
        daysInMonth = monthStart.endOfMonth().diff(monthStart, 'days') + 1,
        cells: (LocalDate | null)[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 0; d < daysInMonth; d++) cells.push(monthStart.add(d, 'days'));
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

//------------------
// Footer
//------------------
const footer = hoistCmp.factory<DateRangePickerLocalModel>(
    ({model, testId, intent, footerNote}) => {
        const {parentModel, singleTab, showApplyControls} = model,
            // Explicit null suppresses the note; undefined takes the default.
            note =
                footerNote === undefined
                    ? model.showAnchorNote
                        ? model.anchorNote
                        : null
                    : footerNote,
            showNote = !singleTab && note != null && note !== false;

        // A single tab with nothing to apply - or that applies as it changes - needs no buttons.
        if (singleTab && (!model.applyEnabled || !showApplyControls)) {
            return div({
                className: 'xh-date-range-picker-popover__single-footer',
                item: parentModel.rangeLabel
            });
        }

        // Nothing to show - e.g. multi-tab with `commitOnChange` and the note suppressed.
        if (!showNote && !showApplyControls) return null;

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
                    omit: !showApplyControls,
                    text: 'Cancel',
                    testId: getTestId(testId, 'cancel'),
                    onClick: () => model.close()
                }),
                button({
                    omit: !showApplyControls,
                    text: 'Apply',
                    outlined: true,
                    // Follows the component's `intent`, so the footer stays coherent with the
                    // popover's selection accent. Primary otherwise, per the Hoist standard.
                    intent: intent ?? 'primary',
                    testId: getTestId(testId, 'apply'),
                    onClick: () => model.apply()
                })
            ]
        });
    }
);

//------------------
// Tabs
//------------------
/** Switcher entry + content for each tab. The model's `tabs` config selects and orders them. */
const TAB_SPECS: DateRangePickerTabSpec[] = [
    {id: 'presets', title: 'Presets', icon: Icon.bolt(), content: presetsTab},
    {id: 'relative', title: 'Relative', icon: Icon.history(), content: relativeTab},
    {id: 'monthYear', title: 'Months & Years', icon: Icon.calendarDays(), content: monthYearTab},
    {id: 'custom', title: 'Custom Range', icon: Icon.calendarRange(), content: customTab}
];

//------------------
// Helpers
//------------------
/** Props making a styled div act as a keyboard-accessible button. Pass null to disable. */
const clickable = (onClick: () => void) =>
    onClick
        ? {
              role: 'button',
              tabIndex: 0,
              onClick,
              onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onClick();
                  }
              }
          }
        : {role: 'button', 'aria-disabled': true};

/**
 * Data attributes for a plain element spec, typed loosely - React's HTML attribute types omit them.
 */
const dataAttrs = (attrs: Record<string, string>) => attrs as object;
