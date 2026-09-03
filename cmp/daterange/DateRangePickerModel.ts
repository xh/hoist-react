/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    PersistableState,
    PersistenceProvider,
    type PersistOptions,
    persistOptions
} from '@xh/hoist/core';
import type {FieldFilterSpec} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {LocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, isEqual, isFunction, isObject, isString, keyBy, uniq, uniqBy} from 'lodash';
import {dateRangePresets, DEFAULT_DATE_RANGE_PRESETS} from './DateRangePresets';
import {
    businessDayOnOrBefore,
    DATE_RANGE_PICKER_TABS,
    fmtDateRange,
    getDateRangeLabel,
    parseDateRangeSelection,
    resolveDateRange,
    stepDateRangeSelection
} from './DateRangeUtils';
import type {
    DateRangeAnchorDay,
    DateRangeContext,
    DateRangePickerTab,
    DateRangePreset,
    DateRangePresetToken,
    DateRangeSelection,
    LocalDateRange,
    ResolvedDateRange
} from './Types';

/**
 * Configuration for a {@link DateRangePickerModel} - a control for selecting a period of time
 * as a preset, relative lookback, calendar month or year, or custom range of dates.
 */
export interface DateRangePickerConfig {
    /**
     * The day that relative and to-date selections resolve against, and (unless `maxDate` is set)
     * the latest selectable date. Default `'localDay'` - the current day in the browser's time
     * zone, kept current as the day rolls. See {@link DateRangeAnchorDay} for the app-day, pinned,
     * and computed alternatives.
     */
    anchorDay?: DateRangeAnchorDay;

    /**
     * True to treat single days by business day: a live `anchorDay` (`'localDay'` or `'appDay'`)
     * snaps back to the most recent business day, and single-day selections step by business day
     * rather than calendar day. Multi-day ranges are unaffected - seven days is still seven days.
     * A pinned or computed `anchorDay` is honored verbatim, never snapped. Default false.
     */
    businessDayMode?: boolean;

    /**
     * False (default) waits for the user to apply a relative or custom draft before updating the
     * value. True commits those drafts as they change, and applies a tab's current draft as soon
     * as the tab is activated, so the popover never shows a period other than the applied one. The
     * Apply and Cancel buttons are omitted. Preset and month/year picks commit on click either way.
     * Overridable app-wide via `DateRangePickerModel.defaults`.
     */
    commitOnChange?: boolean;

    /**
     * Format for dates shown by the picker and in `rangeLabel`, as a moment.js format string.
     * Default `YYYY-MM-DD`, overridable app-wide via `DateRangePickerModel.defaults`.
     */
    dateFormat?: string;

    /**
     * Name of the field to filter in the {@link FieldFilterSpec}s produced by
     * {@link DateRangePickerModel.currentRangeFilter} and `priorRangeFilter`. Required to read
     * those properties.
     */
    filterField?: string;

    /**
     * Initial value, and the fallback when a persisted value is missing or fails validation.
     * Accepts a preset token string as shorthand for a preset selection. Default: the first
     * configured preset, or a rolling 30 days if no presets are configured.
     */
    initialValue?: DateRangeSelection | DateRangePresetToken | string;

    /**
     * Test for whether a date is a business day, consulted by `businessDayMode` and available to
     * app-defined presets via {@link DateRangeContext}. Default: weekdays. Supply to honor a
     * holiday calendar.
     */
    isBusinessDay?: (date: LocalDate) => boolean;

    /**
     * Latest selectable date. Default: the anchor date, so nothing beyond it can be selected. Set
     * later than the anchor to allow selection of future dates.
     */
    maxDate?: LocalDate;

    /** Earliest selectable date. Default: none. */
    minDate?: LocalDate;

    /**
     * Options governing persistence. The value persists under a `dateRangePicker.value` path by
     * default - set `path` to disambiguate multiple pickers sharing one provider.
     */
    persistWith?: DateRangePickerPersistOptions;

    /**
     * Presets offered on the Presets tab, in display order - tokens of Hoist's built-in
     * {@link dateRangePresets}, app-defined {@link DateRangePreset} objects, or a mix.
     * Default: {@link DEFAULT_DATE_RANGE_PRESETS}.
     */
    presets?: Array<DateRangePresetToken | DateRangePreset>;

    /**
     * Tabs to offer within the picker popover, in display order. Default: all tabs, less the
     * Presets tab when `presets` is empty. A single tab renders without a rail.
     */
    tabs?: DateRangePickerTab[];

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
}

/** Default `isBusinessDay` - Monday through Friday. */
const isWeekday = (date: LocalDate): boolean => date.isWeekday;

/** How often a live `anchorDay` is re-evaluated. Cheap: a no-op until the day actually changes. */
const ANCHOR_REFRESH_INTERVAL = 10 * SECONDS;

export interface DateRangePickerPersistOptions extends PersistOptions {
    /** True (default) to persist the value, or provide value-specific PersistOptions. */
    persistValue?: boolean | PersistOptions;
}

/**
 * App-wide overridable defaults for {@link DateRangePickerModel}. Instance config takes precedence.
 */
export interface DateRangePickerModelDefaults {
    anchorDay?: DateRangeAnchorDay;
    businessDayMode?: boolean;
    commitOnChange?: boolean;
    dateFormat?: string;
}

/**
 * Model for a control that allows users to select a period of time - a preset (e.g. MTD, Prev
 * 30 Days), a relative lookback (e.g. Prev 6 Months), a calendar month or year, or a custom
 * range of dates - and the API through which an app reads the applied period.
 *
 * The value is a single compound {@link DateRangeSelection}, which this model resolves to a
 * concrete {@link LocalDateRange} anchored to `anchorDate`, alongside the comparable prior range.
 * The value is plain JSON, so it persists via `persistWith` (including through saved views)
 * without custom serialization, and re-resolves as the anchor date moves forward - a persisted
 * `mtd` stays month-to-date.
 *
 * The anchor date is live by default: this model keeps it on the current day as midnight passes,
 * so every derived range, label, and filter follows without app intervention. See `anchorDay`.
 *
 * Construct one within an app model and render a {@link DateRangePicker} bound to it to let users
 * view and change the value. The value and its derived ranges and filters stay live whether or
 * not a picker is mounted - a locked dashboard widget, for example, can hide its picker but still
 * query by period.
 *
 * @see DateRangePicker
 * @see dateRangePresets
 */
export class DateRangePickerModel extends HoistModel {
    /** App-level defaults for DateRangePickerModel. Instance config takes precedence. */
    static defaults: DateRangePickerModelDefaults = {
        anchorDay: 'localDay',
        businessDayMode: false,
        commitOnChange: false,
        dateFormat: 'YYYY-MM-DD'
    };

    /** The applied selection, always in normalized form. Set via `setValue()`. */
    @observable.ref value: DateRangeSelection;

    /** Tabs offered in the popover, in display order. Set via `setTabs()` - the picker follows. */
    @observable.ref tabs: DateRangePickerTab[];

    /** Presets offered on the Presets tab, in display order. Set via `setPresets()`. */
    @observable.ref presets: DateRangePreset[];

    /** How the anchor date is determined - see {@link DateRangeAnchorDay}. Set via `setAnchorDay()`. */
    @observable.ref anchorDay: DateRangeAnchorDay;

    /**
     * Date that relative and to-date selections resolve against - `anchorDay` resolved, and (in
     * `businessDayMode`) snapped to a business day when live. Kept current by this model.
     */
    @observable.ref anchorDate: LocalDate;

    /** The current day, in the app time zone for `anchorDay: 'appDay'`, else the browser's. */
    @observable.ref today: LocalDate;

    /** Earliest selectable date, or null if unbounded. Set via `setMinDate()`. */
    @observable.ref minDate: LocalDate | null;

    /** Business-day test used by `businessDayMode` and presets. Set via `setIsBusinessDay()`. */
    @observable.ref isBusinessDay: (date: LocalDate) => boolean;

    @bindable businessDayMode: boolean;
    @bindable commitOnChange: boolean;
    @bindable dateFormat: string;
    @bindable filterField: string;

    /** The initial value, and the fallback for a missing or invalid persisted value. */
    readonly defaultValue: DateRangeSelection;

    @observable.ref private explicitMaxDate: LocalDate | null;
    @managed private anchorTimer: Timer;

    /** Latest selectable date - the explicit `maxDate` config if set, otherwise `anchorDate`. */
    get maxDate(): LocalDate {
        return this.explicitMaxDate ?? this.anchorDate;
    }

    /** True if the anchor date is the current day - when `anchorDay` reads as "Today". */
    get isAnchorToday(): boolean {
        return this.anchorDate === this.today;
    }

    /** Configured presets, keyed by token. */
    @computed
    get presetMap(): Record<string, DateRangePreset> {
        return keyBy(this.presets, 'token');
    }

    /** The live context that selections resolve against. */
    @computed
    get context(): DateRangeContext {
        const {anchorDate, today, minDate, maxDate, isBusinessDay, businessDayMode} = this;
        return {
            anchorDate,
            today,
            minDate,
            maxDate,
            isBusinessDay,
            businessDayMode,
            presets: this.presetMap
        };
    }

    /** Resolved date range for the applied value. */
    get currentRange(): LocalDateRange {
        return this.resolvedValue.current;
    }

    /**
     * The immediately preceding, non-overlapping range of comparable shape - the same span one
     * unit earlier for a period-to-date, `count` units earlier for a lookback in weeks or larger
     * units, an equal number of days for day-based windows. Null when the current range is
     * unbounded.
     */
    get priorRange(): LocalDateRange | null {
        return this.resolvedValue.prior;
    }

    /** Short label for the applied value - e.g. `MTD`, `Prev 6 Months`, `Aug 2026`, `Custom`. */
    get label(): string {
        return this.getLabel(this.value);
    }

    /**
     * Resolved range as `start ▸ end` per `dateFormat`, with `…` for an unbounded edge. A single
     * day reads as that one date.
     */
    get rangeLabel(): string {
        return this.fmtRange(this.currentRange);
    }

    /**
     * Longer-form name for the applied value, suitable for panel titles - the period's name
     * rather than its dates, with months spelled out (e.g. `August 2026`). A custom range, and the
     * anchor day when it is not today, have no name beyond their dates, so they read as those.
     */
    get displayName(): string {
        const {value, currentRange} = this;
        if (value.kind === 'custom' || this.labelNeedsDates) return this.rangeLabel;
        if (value.kind === 'month') return currentRange.start.format('MMMM YYYY');
        return this.label;
    }

    /**
     * True when `label` alone does not identify the period - a custom range, or the anchor day
     * when it is not today and so reads only as `As Of`. The picker shows the dates instead.
     */
    get labelNeedsDates(): boolean {
        const {value} = this;
        return (
            value.kind === 'custom' ||
            (value.kind === 'preset' && value.token === 'anchorDay' && !this.isAnchorToday)
        );
    }

    /** True if `stepRange(-1)` would move the applied range - bounded and not yet at `minDate`. */
    get canStepBack(): boolean {
        return !!this.getSteppedValue(-1);
    }

    /** True if `stepRange(1)` would move the applied range - bounded, and not yet at `maxDate`. */
    get canStepForward(): boolean {
        return !!this.getSteppedValue(1);
    }

    /** Filters for `currentRange` on `filterField`, ready to apply to a Store, View, or query. */
    get currentRangeFilter(): FieldFilterSpec[] {
        return this.getRangeFilter(this.currentRange);
    }

    /** Filters for `priorRange` on `filterField`. Empty when there is no prior range. */
    get priorRangeFilter(): FieldFilterSpec[] {
        return this.getRangeFilter(this.priorRange);
    }

    constructor({
        tabs,
        presets = DEFAULT_DATE_RANGE_PRESETS,
        initialValue,
        anchorDay = DateRangePickerModel.defaults.anchorDay,
        businessDayMode = DateRangePickerModel.defaults.businessDayMode,
        commitOnChange = DateRangePickerModel.defaults.commitOnChange,
        minDate = null,
        maxDate = null,
        isBusinessDay = isWeekday,
        filterField = null,
        dateFormat = DateRangePickerModel.defaults.dateFormat,
        persistWith = null,
        xhName = null
    }: DateRangePickerConfig = {}) {
        super();
        makeObservable(this);
        this.xhName = xhName;

        this.businessDayMode = businessDayMode;
        this.commitOnChange = commitOnChange;
        this.dateFormat = dateFormat;
        this.filterField = filterField;
        this.minDate = minDate;
        this.explicitMaxDate = maxDate;
        this.isBusinessDay = isBusinessDay;
        this.setAnchorDay(anchorDay);

        this.setPresets(presets);
        this.setTabs(
            tabs ?? DATE_RANGE_PICKER_TABS.filter(it => it !== 'presets' || !isEmpty(this.presets))
        );

        // Fail loudly on a bad in-code default - a silent fallback would leave data unfiltered.
        this.defaultValue = this.parseValue(
            initialValue ?? this.presets[0]?.token ?? {kind: 'relative', count: 30, unit: 'days'}
        );
        throwIf(!this.defaultValue, 'Invalid DateRangePickerModel `initialValue` config.');
        this.value = this.defaultValue;

        if (persistWith) this.initPersist(persistWith);

        // Keep a live anchor on the current day. Idle for a pinned date - nothing to track.
        this.anchorTimer = Timer.create({
            runFn: () => this.refreshAnchorDate(),
            interval: () => (this.isLiveAnchor ? ANCHOR_REFRESH_INTERVAL : 0)
        });

        this.addReaction(
            {
                // A computed anchor may read observables - follow those immediately, not on the
                // next tick of the timer.
                track: () => (isFunction(this.anchorDay) ? this.anchorDay() : null),
                run: () => this.refreshAnchorDate()
            },
            {
                track: () => [this.businessDayMode, this.isBusinessDay],
                run: () => this.refreshAnchorDate()
            }
        );
    }

    /**
     * Set the applied value. Accepts a preset token string as shorthand for a preset selection.
     * An invalid value (unknown preset, out-of-bounds count or year, malformed date) is logged
     * and ignored.
     */
    @action
    setValue(value: DateRangeSelection | DateRangePresetToken | string) {
        const parsed = this.parseValue(value);
        if (!parsed) {
            this.logWarn('Attempted to set invalid value', value);
            return;
        }
        if (!isEqual(parsed, this.value)) this.value = parsed;
    }

    @action
    setTabs(tabs: DateRangePickerTab[]) {
        throwIf(isEmpty(tabs), 'DateRangePickerModel requires at least one tab.');
        throwIf(
            tabs.some(it => !DATE_RANGE_PICKER_TABS.includes(it)),
            `Unknown DateRangePickerModel tab in [${tabs}].`
        );
        this.tabs = uniq(tabs);
    }

    @action
    setPresets(presets: Array<DateRangePresetToken | DateRangePreset>) {
        const ret = (presets ?? []).map(it => {
            if (isString(it)) {
                const preset = dateRangePresets[it];
                throwIf(!preset, `Unknown date range preset token: '${it}'.`);
                return preset;
            }
            throwIf(
                !it?.token || !it.label || !isFunction(it.resolve),
                'App-defined date range presets require a `token`, a `label`, and a `resolve` function.'
            );
            return it;
        });
        throwIf(
            uniqBy(ret, 'token').length !== ret.length,
            'Date range preset tokens must be unique.'
        );
        this.presets = ret;

        // The applied value may name a preset that is no longer offered.
        if (this.value && !this.parseValue(this.value)) this.value = this.fallbackValue;
    }

    /** Set how the anchor date is determined - see {@link DateRangeAnchorDay}. */
    @action
    setAnchorDay(anchorDay: DateRangeAnchorDay) {
        throwIf(
            !anchorDay ||
                (isString(anchorDay) && anchorDay !== 'localDay' && anchorDay !== 'appDay'),
            `Invalid DateRangePickerModel anchorDay: '${anchorDay}'.`
        );
        this.anchorDay = anchorDay;
        this.refreshAnchorDate();
    }

    @action
    setMinDate(minDate: LocalDate | null) {
        this.minDate = minDate;
    }

    /** Set the latest selectable date, or null to revert to `anchorDate`. */
    @action
    setMaxDate(maxDate: LocalDate | null) {
        this.explicitMaxDate = maxDate;
    }

    @action
    setIsBusinessDay(isBusinessDay: (date: LocalDate) => boolean) {
        this.isBusinessDay = isBusinessDay ?? isWeekday;
    }

    /**
     * Move the applied range by `steps` periods - e.g. `stepRange(-1)` for the previous period.
     * No selection changes kind: presets and relative lookbacks step through their own prior-range
     * logic via `offset`, months and years by calendar unit, and custom ranges by their length.
     * Clamped to `minDate` and `maxDate`, and a no-op when the range cannot move - see
     * {@link stepDateRangeSelection}.
     */
    @action
    stepRange(steps: number) {
        const next = this.getSteppedValue(steps);
        if (next) this.setValue(next);
    }

    /** The selection `stepRange(steps)` would apply, or null if the range cannot move that way. */
    getSteppedValue(steps: number): DateRangeSelection | null {
        return stepDateRangeSelection(this.value, steps, this.context);
    }

    /**
     * Validate and normalize a raw value against this model's presets. Returns null for anything
     * unrecognized - see {@link parseDateRangeSelection}.
     */
    parseValue(raw: unknown): DateRangeSelection | null {
        return parseDateRangeSelection(raw, this.presetMap);
    }

    validateValue(raw: unknown): boolean {
        return !!this.parseValue(raw);
    }

    /** Resolve any selection against this model's current context. */
    resolve(sel: DateRangeSelection): ResolvedDateRange {
        return resolveDateRange(sel, this.context);
    }

    /** Short label for any selection, as it would read on the picker trigger. */
    getLabel(sel: DateRangeSelection): string {
        return getDateRangeLabel(sel, this.context);
    }

    /**
     * Filters bounding `field` to the given range - a `>=` filter for a bounded start and a `<=`
     * filter for a bounded end, so an unbounded range produces no filters at all.
     */
    getRangeFilter(range: LocalDateRange, field: string = this.filterField): FieldFilterSpec[] {
        throwIf(!field, 'DateRangePickerModel requires a `filterField` config to build filters.');
        const ret: FieldFilterSpec[] = [];
        if (range?.start) ret.push({field, op: '>=', value: range.start});
        if (range?.end) ret.push({field, op: '<=', value: range.end});
        return ret;
    }

    /** Format a range as `start ▸ end`, per this model's `dateFormat`. */
    fmtRange(range: LocalDateRange): string {
        return fmtDateRange(range, this.dateFormat);
    }

    //------------------------
    // Implementation
    //------------------------
    @computed.struct
    private get resolvedValue(): ResolvedDateRange {
        return this.resolve(this.value);
    }

    /** True unless `anchorDay` is a pinned LocalDate. */
    private get isLiveAnchor(): boolean {
        return !LocalDate.isLocalDate(this.anchorDay);
    }

    /**
     * Re-evaluate `today` and `anchorDate` from `anchorDay`. Assignments are identity no-ops until
     * the day actually changes, as LocalDate instances are memoized.
     */
    @action
    private refreshAnchorDate() {
        const {anchorDay, businessDayMode, isBusinessDay} = this,
            today = anchorDay === 'appDay' ? LocalDate.currentAppDay() : LocalDate.today();

        let anchorDate: LocalDate;
        if (isString(anchorDay)) {
            // Only a clock-derived anchor is snapped. A pinned or computed date is what the app
            // asked for - e.g. a month-end that falls on a Sunday.
            anchorDate = businessDayMode ? businessDayOnOrBefore(today, {isBusinessDay}) : today;
        } else {
            anchorDate = isFunction(anchorDay) ? anchorDay() : anchorDay;
        }
        throwIf(!anchorDate, 'DateRangePickerModel anchorDay function must return a LocalDate.');

        if (this.today !== today) this.today = today;
        if (this.anchorDate !== anchorDate) this.anchorDate = anchorDate;
    }

    private initPersist({
        persistValue = true,
        path = 'dateRangePicker',
        ...rootPersistWith
    }: DateRangePickerPersistOptions) {
        if (!persistValue) return;

        PersistenceProvider.create({
            persistOptions: persistOptions(
                {path: `${path}.value`},
                rootPersistWith,
                isObject(persistValue) ? persistValue : null
            ),
            target: {
                getPersistableState: () => new PersistableState(this.value),
                setPersistableState: ({value}) => this.restoreValue(value)
            },
            owner: this
        });
    }

    /**
     * Persisted state can be missing (a saved view with no value) or stale (a preset since
     * removed) - either way, fall back to the default rather than carrying a prior value over.
     */
    @action
    private restoreValue(raw: unknown) {
        const next = this.parseValue(raw) ?? this.fallbackValue;
        if (!isEqual(next, this.value)) this.value = next;
    }

    /**
     * `defaultValue` while it still resolves, else the first configured preset, else a rolling 30
     * days - `defaultValue` can itself name a preset that `setPresets()` has since removed.
     */
    private get fallbackValue(): DateRangeSelection {
        return (
            this.parseValue(this.defaultValue) ??
            this.parseValue(this.presets[0]?.token) ?? {
                kind: 'relative',
                count: 30,
                unit: 'days',
                snap: false
            }
        );
    }
}
