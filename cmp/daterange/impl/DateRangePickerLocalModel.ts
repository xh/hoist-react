/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, type Intent, lookup, managed, XH} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import type {LocalDate} from '@xh/hoist/utils/datetime';
import {clamp, isEqual} from 'lodash';
import {createRef, type ReactElement} from 'react';
import {DateRangePickerModel} from '../DateRangePickerModel';
import {
    getDateRangeLabel,
    getDateRangeUnitLabel,
    getMonthStart,
    MAX_RELATIVE_COUNT,
    MIN_SELECTION_YEAR
} from '../DateRangeUtils';
import type {DateRangePickerTab, DateRangeSelection, DateRangeUnit, LocalDateRange} from '../Types';

/**
 * A tab within the picker popover - its rail entry and its content component. Declared by the
 * platform component alongside its tab components and passed in, keeping this model free of any
 * dependency on them.
 *
 * @internal
 */
export interface DateRangePickerTabSpec {
    id: DateRangePickerTab;
    title: string;
    icon: ReactElement;
    content: (props: {model: DateRangePickerLocalModel; testId: string}) => ReactElement;
}

/**
 * Local model for DateRangePicker components. Holds popover-local view state - open state, the
 * active tab, and per-tab drafts - that must be per-component-instance, even when multiple
 * pickers share one DateRangePickerModel. Drafts never touch the parent model's applied value
 * until committed, so Cancel / click-outside / Escape discard them for free.
 *
 * @internal
 */
export class DateRangePickerLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(DateRangePickerModel) parentModel: DateRangePickerModel;

    @bindable isOpen: boolean = false;

    /** Drives the popover's tab rail + content. Tab ids are {@link DateRangePickerTab} values. */
    @managed tabModel: TabContainerModel;

    /** testId of the host picker - tabs derive their own testIds from it. */
    testId: string;

    /** Measured width of the whole control - drives the compact variant in a narrow host. */
    @bindable measuredWidth: number = null;

    /** Intent of the host picker as of its last render - accents selected months and years. */
    intent: Intent = null;

    /** Root element of this instance - scopes popover outside-click handling to this picker. */
    viewRef = createRef<HTMLDivElement>();

    // Relative tab draft.
    @bindable relativeCount: number = 30;
    @bindable relativeUnit: DateRangeUnit = 'days';
    @bindable relativeSnap: boolean = false;

    // Months & Years tab - year currently shown in the grid.
    @bindable gridYear: number;

    // Custom tab draft.
    @observable.ref customStart: LocalDate;
    @observable.ref customEnd: LocalDate;
    @bindable nextEdge: 'start' | 'end' = 'start';
    /** Start-of-month for the left-hand calendar. Right-hand shows the following month. */
    @observable.ref leftMonth: LocalDate;

    private tabSpecs: DateRangePickerTabSpec[];

    // State as of the last open - lets `commitOnChange` tell a user change from the seeded draft.
    private openTabId: DateRangePickerTab;
    private seededRelativeDraft: DateRangeSelection;
    private seededCustomDraft: DateRangeSelection;

    get anchorDate(): LocalDate {
        return this.parentModel.anchorDate;
    }

    get minDate(): LocalDate | null {
        return this.parentModel.minDate;
    }

    get maxDate(): LocalDate {
        return this.parentModel.maxDate;
    }

    get singleTab(): boolean {
        return this.parentModel.tabs.length === 1;
    }

    get activeTabId(): DateRangePickerTab {
        return this.tabModel.activeTabId as DateRangePickerTab;
    }

    //------------------
    // Relative tab
    //------------------
    get clampedCount(): number {
        return clamp(Math.round(this.relativeCount ?? 1), 1, MAX_RELATIVE_COUNT);
    }

    @computed.struct
    get relativeDraft(): DateRangeSelection {
        return {
            kind: 'relative',
            count: this.clampedCount,
            unit: this.relativeUnit,
            snap: this.relativeSnap
        };
    }

    get relativeRange(): LocalDateRange {
        return this.parentModel.resolve(this.relativeDraft).current;
    }

    get relativeDayCount(): number {
        const {start, end} = this.relativeRange;
        return end.diff(start, 'days') + 1;
    }

    /**
     * False for days, where a day is already a calendar boundary - snapping has nothing to round
     * out, so days resolve identically either way.
     */
    get snapApplies(): boolean {
        return this.relativeUnit !== 'days';
    }

    /** Explains the Relative tab's snap choice, or the day window when snap does not apply. */
    get relativeModeHelpText(): string {
        const {relativeUnit: unit, anchorDate, anchorNoun} = this,
            n = this.clampedCount,
            singular = getDateRangeUnitLabel(unit, 1).toLowerCase(),
            units = getDateRangeUnitLabel(unit, n).toLowerCase();

        if (unit === 'days') {
            return `Rolling window of exactly ${n} calendar ${units} ending ${anchorNoun}.`;
        }
        if (this.relativeSnap) {
            // The window stops at the anchor date, so the last unit is normally incomplete -
            // unless the anchor happens to fall on its final day.
            const partial = anchorDate.endOf(unit) === anchorDate ? '' : ' (partial)',
                containing = this.parentModel.isAnchorToday ? 'today' : 'the anchor date';
            return n === 1
                ? `The${partial} calendar ${singular} containing ${containing}.`
                : `${n} calendar ${units}, ending with the${partial} one containing ${containing}.`;
        }
        return `Rolling window of exactly ${n} ${units} ending ${anchorNoun}.`;
    }

    /** Secondary line for the Relative tab's preview - the window's length. */
    get relativePreviewCountText(): string {
        const days = this.relativeDayCount;
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    //------------------
    // Months & Years tab
    //------------------
    get canYearBack(): boolean {
        return this.gridYear > Math.max(MIN_SELECTION_YEAR, yearOf(this.minDate) ?? 0);
    }

    get canYearForward(): boolean {
        return this.gridYear < yearOf(this.maxDate);
    }

    isMonthDisabled(month: number): boolean {
        const {minDate, maxDate} = this,
            start = getMonthStart(this.gridYear, month);
        return start > maxDate || (minDate && start.endOfMonth() < minDate);
    }

    get yearSelectable(): boolean {
        const {gridYear, minDate, maxDate} = this;
        return gridYear <= yearOf(maxDate) && (!minDate || gridYear >= yearOf(minDate));
    }

    get yearRowLabel(): string {
        const {gridYear: year, parentModel} = this,
            toDate = getDateRangeLabel({kind: 'year', year}, parentModel.context) === 'YTD';
        return toDate ? `${year} Year to Date` : `Full Year ${year}`;
    }

    //------------------
    // Custom tab
    //------------------
    /** The Custom tab's draft, or null before the first open seeds it. */
    @computed.struct
    get customDraft(): DateRangeSelection {
        const {customStart, customEnd} = this;
        if (!customStart || !customEnd) return null;
        return {kind: 'custom', start: customStart.isoString, end: customEnd.isoString};
    }

    get rightMonth(): LocalDate {
        return this.leftMonth.add(1, 'months');
    }

    get canCalBack(): boolean {
        const {minDate, leftMonth} = this;
        return minDate
            ? leftMonth > minDate.startOfMonth()
            : yearOf(leftMonth) > MIN_SELECTION_YEAR;
    }

    get canCalForward(): boolean {
        return this.rightMonth < this.maxDate.startOfMonth();
    }

    isDayDisabled(day: LocalDate): boolean {
        const {minDate, maxDate} = this;
        return day > maxDate || (minDate && day < minDate);
    }

    //------------------
    // Footer
    //------------------
    /**
     * True when the active tab holds a draft to apply. Preset and month/year picks commit on click.
     */
    get applyEnabled(): boolean {
        return this.activeTabId === 'relative' || this.activeTabId === 'custom';
    }

    /** True to offer Apply and Cancel - drafts wait for Apply rather than committing on change. */
    get showApplyControls(): boolean {
        return !this.parentModel.commitOnChange;
    }

    /** Whether the default footer note about anchoring applies to the active tab. */
    get showAnchorNote(): boolean {
        const {activeTabId} = this;
        return activeTabId === 'presets' || activeTabId === 'relative';
    }

    /**
     * Default footer note - tells the user what periods are relative to, and which clock decides
     * it, as a prose prefix and the date for the component to set apart. A live anchor names its
     * source, so a user whose day differs from the application's can see why the picker's "today"
     * is not theirs. A pinned or computed anchor is just its date.
     */
    get anchorNote(): {prefix: string; date: string} {
        const {anchorDate, parentModel} = this,
            {anchorDay, businessDayMode} = parentModel,
            date = parentModel.fmtDay(anchorDate),
            day = businessDayMode ? 'business day' : 'day';

        let source = '';
        if (anchorDay === 'localDay') {
            source = ` your current ${day}`;
        } else if (anchorDay === 'appDay') {
            source = ` the current ${day} in ${XH.environmentService.get('appTimeZone')}`;
        }
        return {prefix: `Relative to${source}: `, date};
    }

    private get anchorNoun(): string {
        return this.parentModel.isAnchorToday ? 'today' : 'on the anchor date';
    }

    constructor(testId: string, tabSpecs: DateRangePickerTabSpec[]) {
        super();
        makeObservable(this);
        this.testId = testId;
        this.tabSpecs = tabSpecs;
    }

    override onLinked() {
        this.tabModel = new TabContainerModel({
            // Tabs hold no state of their own - every draft lives on this model - so unmount
            // on hide rather than retaining hidden content.
            renderMode: 'unmountOnHide',
            tabs: this.buildTabs(),
            xhImpl: true
        });

        this.addReaction({
            track: () => this.parentModel.tabs,
            run: () => this.tabModel.setTabs(this.buildTabs())
        });

        // Never hold a snap that does nothing: it would persist into the committed value and make
        // `relativeModeHelpText` describe an alignment that is not happening. Tracks both sides -
        // the unit can change under a set snap.
        this.addReaction({
            track: () => [this.snapApplies, this.relativeSnap],
            run: ([applies, snap]) => {
                if (!applies && snap) this.relativeSnap = false;
            }
        });

        // With `commitOnChange`, a relative or custom draft applies as it changes, and activating
        // either tab applies its current draft - so the popover never shows a period other than
        // the applied one. Opening the popover itself commits nothing.
        this.addReaction({
            track: () => [this.isOpen, this.activeTabId, this.relativeDraft, this.customDraft],
            run: () => this.commitDraftIfLive()
        });
    }

    //------------------
    // Open / close / commit
    //------------------
    toggleOpen() {
        this.isOpen ? this.close() : this.open();
    }

    @action
    open() {
        const {parentModel, anchorDate, maxDate} = this,
            {value, tabs} = parentModel,
            valueTab = tabForKind(value.kind),
            openTabId = tabs.includes(valueTab) ? valueTab : tabs[0];

        this.tabModel.activateTab(openTabId);

        // A draft starts at offset zero - stepping is done from the trigger, not the tab.
        if (value.kind === 'relative') {
            this.relativeCount = value.count;
            this.relativeUnit = value.unit;
            this.relativeSnap = value.snap;
        } else {
            this.relativeCount = 30;
            this.relativeUnit = 'days';
            this.relativeSnap = false;
        }

        this.gridYear =
            value.kind === 'month' || value.kind === 'year' ? value.year : yearOf(anchorDate);

        // Seed the custom draft from the applied resolved range, clamped to selectable bounds.
        const {start: curStart, end: curEnd} = parentModel.currentRange;
        let end = curEnd ?? maxDate;
        if (end > maxDate) end = maxDate;
        let start = curStart ?? end;
        if (start > end) start = end;
        if (this.minDate && start < this.minDate) start = this.minDate;
        if (start > end) end = start;
        this.customStart = start;
        this.customEnd = end;
        this.nextEdge = 'start';

        this.showMonthOnRight(end);

        this.openTabId = openTabId;
        this.seededRelativeDraft = this.relativeDraft;
        this.seededCustomDraft = this.customDraft;

        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    @action
    commit(value: DateRangeSelection) {
        this.parentModel.setValue(value);
        this.close();
    }

    apply() {
        const {activeTabId} = this;
        if (activeTabId === 'relative') {
            this.commit(this.relativeDraft);
        } else if (activeTabId === 'custom') {
            this.commit(this.customDraft);
        } else {
            this.close();
        }
    }

    //------------------
    // Tab interactions
    //------------------
    @action
    stepCount(delta: number) {
        this.relativeCount = clamp(this.clampedCount + delta, 1, MAX_RELATIVE_COUNT);
    }

    @action
    stepYear(delta: number) {
        this.gridYear += delta;
    }

    @action
    stepCalendar(delta: number) {
        this.leftMonth = this.leftMonth.add(delta, 'months');
    }

    @action
    pickDay(day: LocalDate) {
        if (this.nextEdge === 'start' || day < this.customStart) {
            this.customStart = day;
            this.customEnd = day;
            this.nextEdge = 'end';
        } else {
            this.customEnd = day;
            this.nextEdge = 'start';
        }
    }

    @action
    commitStartInput(val: LocalDate) {
        if (!val) return;
        this.customStart = val;
        if (val > this.customEnd) this.customEnd = val;
        this.showMonthOnLeft(val);
    }

    @action
    commitEndInput(val: LocalDate) {
        if (!val) return;
        this.customEnd = val;
        if (val < this.customStart) this.customStart = val;
        this.showMonthOnRight(val);
    }

    //------------------
    // Implementation
    //------------------
    /** Tab configs in the order the app configured them - the model's `tabs` sets the order. */
    private buildTabs(): TabConfig[] {
        return this.parentModel.tabs.map(id => {
            const {title, icon, content} = this.tabSpecs.find(spec => spec.id === id);
            return {id, title, icon, content: () => content({model: this, testId: this.testId})};
        });
    }

    private commitDraftIfLive() {
        const {parentModel, isOpen, activeTabId, openTabId} = this;
        if (!isOpen || !parentModel.commitOnChange) return;

        const tabChanged = activeTabId !== openTabId;
        if (activeTabId === 'relative') {
            if (tabChanged || !isEqual(this.relativeDraft, this.seededRelativeDraft)) {
                parentModel.setValue(this.relativeDraft);
            }
        } else if (activeTabId === 'custom' && this.customDraft) {
            if (tabChanged || !isEqual(this.customDraft, this.seededCustomDraft)) {
                parentModel.setValue(this.customDraft);
            }
        }
    }

    /** Position the calendars so `date`'s month shows on the left, right within maxDate. */
    @action
    private showMonthOnLeft(date: LocalDate) {
        const maxLeft = this.maxDate.startOfMonth().subtract(1, 'months'),
            month = date.startOfMonth();
        this.leftMonth = month < maxLeft ? month : maxLeft;
    }

    /** Position the calendars so `date`'s month shows on the right, clamped to maxDate. */
    @action
    private showMonthOnRight(date: LocalDate) {
        const maxRight = this.maxDate.startOfMonth(),
            month = date.startOfMonth();
        this.leftMonth = (month < maxRight ? month : maxRight).subtract(1, 'months');
    }
}

/** The tab on which a selection of the given kind is made. */
function tabForKind(kind: DateRangeSelection['kind']): DateRangePickerTab {
    switch (kind) {
        case 'preset':
            return 'presets';
        case 'month':
        case 'year':
            return 'monthYear';
        default:
            return kind;
    }
}

function yearOf(date: LocalDate | null): number | null {
    return date ? Number(date.format('YYYY')) : null;
}
