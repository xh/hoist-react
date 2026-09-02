/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    PersistableState,
    PersistenceProvider,
    type PersistOptions,
    persistOptions
} from '@xh/hoist/core';
import type {FieldFilterSpec} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, isEqual, isFunction, isObject, isString, keyBy, uniq, uniqBy} from 'lodash';
import {dateRangePresets, DEFAULT_DATE_RANGE_PRESETS} from './DateRangePresets';
import {
    DATE_RANGE_PICKER_TABS,
    fmtDateRange,
    getDateRangeLabel,
    parseDateRangeSelection,
    resolveDateRange,
    stepDateRangeSelection
} from './DateRangeUtils';
import type {
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
     * Date that relative and to-date selections resolve against, and (unless `maxDate` is set)
     * the latest selectable date. Supply a function to track a live, observable source - e.g.
     * the as-of date of the data on display. Default: today, as of construction.
     */
    anchorDate?: LocalDate | (() => LocalDate);

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
     * Test for whether a date is a business day, consulted by presets such as `lastBusinessDay`
     * and available to app-defined presets via {@link DateRangeContext}. Default: weekdays. Supply
     * to honor a holiday calendar.
     */
    isBusinessDay?: (date: LocalDate) => boolean;

    /**
     * Latest selectable date. Default: `anchorDate`, so nothing beyond the anchor can be
     * selected. Set later than the anchor to allow selection of future dates.
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
     * Tabs to offer within the picker popover, in rail order. Default: all tabs, less the
     * Presets tab when `presets` is empty. A single tab renders without a rail.
     */
    tabs?: DateRangePickerTab[];

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
}

/** Default `isBusinessDay` - Monday through Friday. */
const isWeekday = (date: LocalDate): boolean => date.isWeekday;

export interface DateRangePickerPersistOptions extends PersistOptions {
    /** True (default) to persist the value, or provide value-specific PersistOptions. */
    persistValue?: boolean | PersistOptions;
}

/**
 * App-wide overridable defaults for {@link DateRangePickerModel}. Instance config takes precedence.
 */
export interface DateRangePickerModelDefaults {
    commitOnChange?: boolean;
    dateFormat?: string;
}

/**
 * Model for a control that allows users to select a period of time - a preset (e.g. MTD, Last
 * 30 Days), a relative lookback (e.g. Last 6 Months), a calendar month or year, or a custom
 * range of dates - and the API through which an app reads the applied period.
 *
 * The value is a single compound {@link DateRangeSelection}, which this model resolves to a
 * concrete {@link LocalDateRange} anchored to `anchorDate`, alongside the comparable prior range.
 * The value is plain JSON, so it persists via `persistWith` (including through saved views)
 * without custom serialization, and re-resolves as the anchor date moves forward - a persisted
 * `mtd` stays month-to-date.
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
        commitOnChange: false,
        dateFormat: 'YYYY-MM-DD'
    };

    /** The applied selection, always in normalized form. Set via `setValue()`. */
    @observable.ref value: DateRangeSelection;

    /** Tabs offered in the popover, in rail order. Set via `setTabs()` - the picker follows. */
    @observable.ref tabs: DateRangePickerTab[];

    /** Presets offered on the Presets tab, in display order. Set via `setPresets()`. */
    @observable.ref presets: DateRangePreset[];

    /** Date that relative and to-date selections resolve against. Set via `setAnchorDate()`. */
    @observable.ref anchorDate: LocalDate;

    /** Earliest selectable date, or null if unbounded. Set via `setMinDate()`. */
    @observable.ref minDate: LocalDate | null;

    /** Business-day test used by presets. Set via `setIsBusinessDay()`. */
    @observable.ref isBusinessDay: (date: LocalDate) => boolean;

    @bindable commitOnChange: boolean;
    @bindable dateFormat: string;
    @bindable filterField: string;

    /** The initial value, and the fallback for a missing or invalid persisted value. */
    readonly defaultValue: DateRangeSelection;

    @observable.ref private explicitMaxDate: LocalDate | null;

    /** Latest selectable date - the explicit `maxDate` config if set, otherwise `anchorDate`. */
    get maxDate(): LocalDate {
        return this.explicitMaxDate ?? this.anchorDate;
    }

    /** Configured presets, keyed by token. */
    @computed
    get presetMap(): Record<string, DateRangePreset> {
        return keyBy(this.presets, 'token');
    }

    /** The live context that selections resolve against. */
    @computed
    get context(): DateRangeContext {
        const {anchorDate, minDate, maxDate, isBusinessDay, presetMap: presets} = this;
        return {anchorDate, minDate, maxDate, isBusinessDay, presets};
    }

    /** Resolved date range for the applied value. */
    get currentRange(): LocalDateRange {
        return this.resolvedValue.current;
    }

    /**
     * The immediately preceding, non-overlapping range of comparable shape - the same span one
     * unit earlier for a period-to-date, an equal number of days for a rolling window. Null when
     * the current range is unbounded.
     */
    get priorRange(): LocalDateRange | null {
        return this.resolvedValue.prior;
    }

    /** Short label for the applied value - e.g. `MTD`, `Last 6 Months`, `Aug 2026`, `Custom`. */
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
     * rather than its dates, with months spelled out (e.g. `August 2026`). A custom range is the
     * one selection with no name, so it falls back to its dates.
     */
    get displayName(): string {
        const {value, currentRange} = this;
        if (value.kind === 'custom') return this.rangeLabel;
        if (value.kind === 'month') return currentRange.start.format('MMMM YYYY');
        return this.label;
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
        anchorDate,
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

        this.commitOnChange = commitOnChange;
        this.dateFormat = dateFormat;
        this.filterField = filterField;
        this.minDate = minDate;
        this.explicitMaxDate = maxDate;
        this.isBusinessDay = isBusinessDay;

        if (isFunction(anchorDate)) {
            this.anchorDate = anchorDate();
            this.addReaction({track: anchorDate, run: v => this.setAnchorDate(v)});
        } else {
            this.anchorDate = anchorDate ?? LocalDate.today();
        }

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
                !it?.token || !isFunction(it.resolve),
                'App-defined date range presets require a `token` and a `resolve` function.'
            );
            return it;
        });
        throwIf(
            uniqBy(ret, 'token').length !== ret.length,
            'Date range preset tokens must be unique.'
        );
        this.presets = ret;
    }

    @action
    setAnchorDate(anchorDate: LocalDate) {
        this.anchorDate = anchorDate;
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
     * Move the applied range by `steps` periods of its own length - e.g. `stepRange(-1)` for the
     * previous period. Month and year selections keep their kind. All others become a `custom`
     * selection of the shifted dates. Clamped to `minDate` and `maxDate`, and a no-op when the
     * range cannot move - see {@link stepDateRangeSelection}.
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
        this.value = this.parseValue(raw) ?? this.defaultValue;
    }
}
