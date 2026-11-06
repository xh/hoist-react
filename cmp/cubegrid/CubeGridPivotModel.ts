/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    ColumnGroupShowMode,
    ColumnGroupSpec,
    ColumnSpec,
    ColumnState,
    GridModel
} from '@xh/hoist/cmp/grid';
import {ColumnWidthCalculator} from '@xh/hoist/cmp/grid/impl/ColumnWidthCalculator';
import type {HAlign, HSide, ReactionSpec, Some, VSide} from '@xh/hoist/core';
import {HoistModel} from '@xh/hoist/core';
import type {CubeField, PivotCellField, PivotPath, View} from '@xh/hoist/data';
import {action, bindable, bindableRef, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {
    castArray,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isFunction,
    isObject,
    isString,
    keyBy,
    map,
    mapValues,
    max,
    omit,
    orderBy,
    sortBy,
    sumBy
} from 'lodash';
import type {CubeGridModel} from './CubeGridModel';
import type {
    PivotColumnContext,
    PivotColumnGroupContext,
    PivotColumnGroupSpec,
    PivotColumnSizingOptions,
    PivotColumnSpec,
    PivotSort
} from './Types';
import {RESERVED_PIVOT_COLUMN_GROUP_KEYS, RESERVED_PIVOT_COLUMN_KEYS} from './Types';

/**
 * Configuration for the pivot region of a {@link CubeGridModel}, as `gridConfig` is for its
 * GridModel. Applies when the query sets {@link QueryConfig.pivot}.
 *
 * @see CubeGridPivotModel
 */
export interface CubeGridPivotConfig {
    /**
     * Column config per measure, applied to every pivot column built for it under every path -
     * renderer, width, align, and so on. Each entry's `field` names a `pivot.valueFields` entry,
     * and their order here is the order of the columns within each path group. A measure
     * without an entry gets a default column.
     *
     * Specs are expected to be shared with the fixed `columns`, so {@link RESERVED_PIVOT_COLUMN_KEYS}
     * are stripped rather than rejected. Pivot columns are not hideable and stay out of the column
     * chooser - the region is the query's, so drop a field from `pivot.valueFields` to remove its
     * columns.
     */
    columns?: PivotColumnSpec[];

    /**
     * Overrides for one pivot column, merged over its `columns` entry - a class on the `total`
     * columns, a width keyed on the path, and so on. Called per column on every rebuild. Return
     * null for none. Reserved keys are stripped as for `columns`.
     */
    columnSpecFn?: (ctx: PivotColumnContext) => PivotColumnSpec;

    /**
     * Overrides for one pivot column group, merged over the built group - a header class or
     * alignment on the `total` groups, a header name keyed on the path, and so on. Called per
     * group on every rebuild. Return null for none. {@link RESERVED_PIVOT_COLUMN_GROUP_KEYS} are
     * stripped.
     */
    columnGroupSpecFn?: (ctx: PivotColumnGroupContext) => PivotColumnGroupSpec;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    sortBy?: PivotSort[];

    /**
     * Summary columns while a pivot group is expanded, as {@link GridConfig.showSummary} is the
     * summary row: a column per value field under a `Total` header, holding the pivot region's
     * row totals and each parent pivot group's subtotals. A collapsed group always shows its
     * summary. True for the default 'left', where the summary keeps its collapsed position and
     * the group opens to its right, or an {@link HSide} to place it within the group. Default
     * false. Bind this rather than expecting the column chooser to restore it.
     *
     * Summary cells and headers carry the `xh-cube-grid__total-cell` and
     * `xh-cube-grid__total-header` classes, unstyled, for apps that want to set them apart.
     */
    showSummaries?: boolean | HSide;

    /**
     * True (default) to let the pivot region and each parent pivot group collapse from its header
     * to its summary columns. False to fix every group open, with summary columns only where
     * `showSummaries` asks for them.
     */
    groupsCollapsible?: boolean;

    /**
     * True (default) to show a `Total` header over a collapsed group's summary columns. False to
     * drop it, so their headers stretch up to the group's. The collapsed summary then has colIds
     * of its own, prefixed `collapsed>>`, and is left out of exports while the `total>>` columns
     * also show expanded.
     */
    collapsedTotalHeader?: boolean;

    /**
     * True (default) to give every pivot column of a measure one width, or options to tune it.
     * The width is the measure's widest data, plus an even share of any room a displayed group
     * label needs beyond the data of the columns it spans, up to `headerFitMaxWidth`. It follows
     * as groups expand and collapse, and a manual resize moves all of the measure's columns. False
     * to size each column on its own, as in any grid.
     */
    columnSizing?: boolean | PivotColumnSizingOptions;

    /**
     * Pivot header level to expand to on initial load, as {@link GridConfig.expandLevel} is for
     * rows. 0 collapses the region to the row summary, 1 shows the top-level pivot groups
     * collapsed to theirs, and so on. Default -1, all levels expanded. Initial state only -
     * thereafter {@link GridModel.columnGroupState} tracks each group, keyed on its path, and
     * persists it with `gridConfig.persistWith`. See {@link CubeGridPivotModel.expandToLevel}.
     */
    expandLevel?: number;
}

/**
 * The pivot region of a {@link CubeGridModel} - its options, bindable for toolbar controls, and
 * the column groups built from them: their paths, summaries, shared widths and expansion. Created
 * by the CubeGridModel from its `pivotConfig`, which merges the region into its grid's columns.
 *
 * @see CubeGridPivotConfig
 */
export class CubeGridPivotModel extends HoistModel {
    /** Pivot header level last expanded to, or -1 for all. Set via {@link expandToLevel}. */
    @observable accessor expandLevel: number;

    @bindableRef accessor columns: PivotColumnSpec[];
    @bindableRef accessor columnSpecFn: (ctx: PivotColumnContext) => PivotColumnSpec;
    @bindableRef accessor columnGroupSpecFn: (ctx: PivotColumnGroupContext) => PivotColumnGroupSpec;
    @bindableRef accessor sortBy: PivotSort[];
    @bindable accessor showSummaries: boolean | HSide;
    @bindable accessor groupsCollapsible: boolean;
    @bindable accessor collapsedTotalHeader: boolean;
    @bindableRef accessor columnSizing: boolean | PivotColumnSizingOptions;

    private readonly cubeGridModel: CubeGridModel;

    /** @internal - created by {@link CubeGridModel}. */
    constructor(
        {
            columns = [],
            columnSpecFn = null,
            columnGroupSpecFn = null,
            sortBy = [],
            showSummaries = false,
            groupsCollapsible = true,
            collapsedTotalHeader = true,
            columnSizing = true,
            expandLevel = -1
        }: CubeGridPivotConfig,
        cubeGridModel: CubeGridModel
    ) {
        super();
        this.cubeGridModel = cubeGridModel;
        this.columns = columns;
        this.columnSpecFn = columnSpecFn;
        this.columnGroupSpecFn = columnGroupSpecFn;
        this.sortBy = sortBy;
        this.showSummaries = showSummaries;
        this.groupsCollapsible = groupsCollapsible;
        this.collapsedTotalHeader = collapsedTotalHeader;
        this.columnSizing = columnSizing;
        this.expandLevel = expandLevel;
    }

    /**
     * Expand the pivot column groups to the given level, or all for -1, as
     * {@link GridModel.expandToLevel} does for rows. The region is level 0 and each path group
     * the level of its depth. Later rebuilds mint new groups at this level too.
     */
    @action
    expandToLevel(level: number) {
        this.expandLevel = level;
        const {gridModel, _groupLevels} = this;
        gridModel.setColumnGroupState(
            gridModel.columnGroupState.map(it =>
                _groupLevels.has(it.groupId)
                    ? {
                          ...it,
                          expanded: this.isLevelExpanded(_groupLevels.get(it.groupId))
                      }
                    : it
            )
        );
    }

    expandAll() {
        this.expandToLevel(-1);
    }

    collapseAll() {
        this.expandToLevel(0);
    }

    /** @internal - options the built region depends on, tracked by the parent's rebuild. */
    get regionDeps(): unknown[] {
        return [
            this.showSummaries,
            this.groupsCollapsible,
            this.collapsedTotalHeader,
            this.sortBy,
            this.columns,
            this.columnSpecFn,
            this.columnGroupSpecFn
        ];
    }

    /** @internal - leaf colIds of the built region. */
    get colIds(): Set<string> {
        return this._colIds;
    }

    /** @internal - the width shared by the column's measure, if one has been applied. */
    widthFor(colId: string): number {
        return this._widths.get(this._measureByColId.get(colId));
    }

    /** @internal - starts syncing widths, once the parent's GridModel exists. */
    initWidths() {
        this.addReaction(this.widthsReaction(), this.sizingReaction());
    }

    /** @internal - builds the pivot region's column group, or null when the query has none. */
    buildRegion(): ColumnGroupSpec {
        const {paths, cellFields} = this.view.result;

        this.indexCellFields(cellFields);

        // Stripped once per rebuild.
        const {columns} = this;
        columns.forEach(it =>
            throwIf(!it.field, 'Each pivot `columns` entry must name a value field in `field`.')
        );
        this._columnsByField = mapValues(keyBy(columns, 'field'), it =>
            omit(it, RESERVED_PIVOT_COLUMN_KEYS)
        );

        this._colIds = new Set();
        this._groupLevels = new Map();
        this._measureByColId = new Map();
        this._regionGroup = null;
        this._labelWidths = new Map();
        if (!this.query.isPivoted || isEmpty(paths)) return null;

        // One group over the whole region, titled by the pivot dimensions, collapses to the row
        // summaries.
        const pathCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path, [])),
            pivotGroup = this.buildColGroup(
                PIVOT_GROUP_ID,
                this.query.pivot.dimensions.map(it => it.displayName).join(' › '),
                this.buildGroupChildren(pathCols, this._rootPath, []),
                {level: 0, ctx: {path: this._rootPath, kind: 'path'}}
            );

        this._regionGroup = pivotGroup;
        this._colIds = new Set(leafColIds([pivotGroup]));
        return pivotGroup;
    }

    //------------------------
    // Implementation
    //------------------------

    private get view(): View {
        return this.cubeGridModel.view;
    }

    private get query() {
        return this.view.query;
    }

    private get gridModel(): GridModel {
        return this.cubeGridModel.gridModel;
    }

    private isLevelExpanded(level: number): boolean {
        const {expandLevel} = this;
        return expandLevel < 0 || level < expandLevel;
    }

    // Measures in pivot `columns` order, then any the app left unconfigured in query order.
    private get valueFields(): CubeField[] {
        const fields = this.query.pivot?.valueFields ?? [],
            listed = this.columns.map(it => it.field);
        return sortBy(fields, it => {
            const idx = listed.indexOf(it.name);
            return idx === -1 ? listed.length : idx;
        });
    }

    private get summarySide(): HSide {
        return resolveSide(this.showSummaries, 'left');
    }

    // Keyed on path identity.
    private indexCellFields(cellFields: PivotCellField[]) {
        const byPath = new Map<PivotPath, Map<string, string>>();
        let rootPath: PivotPath = null;

        cellFields.forEach(({name, path, valueField}) => {
            if (path.isRoot) rootPath = path;
            let byField = byPath.get(path);
            if (!byField) byPath.set(path, (byField = new Map()));
            byField.set(valueField.name, name);
        });

        this._cellFieldNames = byPath;
        this._rootPath = rootPath;
    }

    // The tooltip carries the full path, as an ancestor's header is often scrolled out of view.
    private buildPathColumn(
        path: PivotPath,
        ancestorLabels: string[]
    ): ColumnSpec | ColumnGroupSpec {
        const labels = [...ancestorLabels, path.label],
            headerTooltip = labels.join(' › ');

        // Always a group, so the measure name stays visible beside any fixed columns.
        if (isEmpty(path.children)) {
            return this.buildColGroup(path.key, path.label, this.buildValueColumns(path, labels), {
                level: path.depth,
                headerAlign: 'center',
                headerTooltip,
                ctx: {path, kind: 'path'}
            });
        }

        const childCols = this.sortPaths(path.children, path.depth).map(child =>
            this.buildPathColumn(child, labels)
        );
        return this.buildColGroup(
            path.key,
            path.label,
            this.buildGroupChildren(childCols, path, labels),
            {
                level: path.depth,
                headerTooltip,
                ctx: {path, kind: 'path'}
            }
        );
    }

    // Children of a group that collapses to its summary. The path groups show expanded. The
    // summary sits under a Total header, always when asked and otherwise only while collapsed.
    // Without that header on collapse, a second copy of the summary shows while collapsed, under
    // colIds of its own, as AG Grid reuses a column's prior group when it moves out of one. AG
    // Grid pads the copy, so the header depth stays fixed. With collapsing off there is only the
    // Total group, only when asked.
    private buildGroupChildren(
        pathCols: Array<ColumnSpec | ColumnGroupSpec>,
        summaryPath: PivotPath,
        labels: string[]
    ): Array<ColumnSpec | ColumnGroupSpec> {
        const {summarySide, groupsCollapsible, collapsedTotalHeader} = this;
        if (!summarySide && !groupsCollapsible) return pathCols;

        const children = groupsCollapsible
                ? pathCols.map(it => ({...it, groupShowMode: 'expanded' as const}))
                : pathCols,
            isBare = groupsCollapsible && !collapsedTotalHeader,
            summary: Array<ColumnSpec | ColumnGroupSpec> = isBare
                ? this.buildSummaryColumns(summaryPath, labels, BARE_TOTAL_PREFIX).map(it => ({
                      ...it,
                      groupShowMode: 'collapsed' as const,
                      excludeFromExport: !!summarySide
                  }))
                : [];

        if (summarySide || !isBare) {
            const group = this.buildColGroup(
                `${summaryPath.isRoot ? PIVOT_GROUP_ID : summaryPath.key}:total`,
                'Total',
                this.buildSummaryColumns(summaryPath, labels, TOTAL_PREFIX),
                {
                    headerAlign: 'center',
                    groupShowMode: summarySide ? (isBare ? 'expanded' : null) : 'collapsed',
                    ctx: {path: summaryPath, kind: 'total'}
                }
            );
            summary.push({...group, headerClass: withClass(group.headerClass, TOTAL_HEADER_CLASS)});
        }

        return summarySide === 'left' ? [...summary, ...children] : [...children, ...summary];
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    // A summary column binds the path's own cell but takes a colId of its own, so the root summary
    // never collides with a fixed column bound to the same measure. All carry the total classes,
    // over any the app adds.
    private buildSummaryColumns(path: PivotPath, labels: string[], prefix: string): ColumnSpec[] {
        return this.buildValueColumns(path, [...labels, 'Total'], 'total').map(col => ({
            ...col,
            colId: this.noteMeasure(`${prefix}${col.colId}`, this._measureByColId.get(col.colId)),
            cellClass: withClass(col.cellClass, TOTAL_CELL_CLASS),
            headerClass: withClass(col.headerClass, TOTAL_HEADER_CLASS)
        }));
    }

    private buildValueColumns(
        path: PivotPath,
        labels: string[],
        kind: PivotColumnContext['kind'] = 'cell'
    ): ColumnSpec[] {
        return this.valueFields.map(field => this.buildValueColumn(path, field, labels, kind));
    }

    // The pivot region is the query's: these columns never move, hide or filter, and the chooser
    // does not list them. A cell is an aggregate, so no query filter can express a condition on
    // it. Field names are built from data values that may contain dots. The export header is the
    // path's labels and the column's header, as the header alone repeats across paths.
    private buildValueColumn(
        path: PivotPath,
        field: CubeField,
        labels: string[],
        kind: PivotColumnContext['kind']
    ): ColumnSpec {
        const name = this.cellFieldName(path, field),
            spec = this._columnsByField[field.name] ?? {},
            overrides = this.columnSpecFn?.({path, field, kind, spec});
        return {
            ...spec,
            ...(overrides ? omit(overrides, RESERVED_PIVOT_COLUMN_KEYS) : null),
            colId: this.noteMeasure(name, field.name),
            field: name,
            movable: false,
            hideable: false,
            filterable: false,
            excludeFromChooser: true,
            enableDotSeparatedFieldPath: false,
            exportName: ({column, gridModel}) => {
                const {headerName} = column,
                    header = isFunction(headerName)
                        ? headerName({column, gridModel, agParams: null})
                        : headerName;
                return [...labels, isString(header) ? header : field.displayName].join(' › ');
            },
            // Keeps the pivot block trailing: a fixed column cannot be dropped inside it.
            agOptions: {lockPosition: 'right'}
        };
    }

    // A group with a `level` is a pivot group that expands and collapses. Wide groups are
    // left-aligned, as a centered label on one sits out of the viewport.
    private buildColGroup(
        groupId: string,
        headerName: string,
        children: Array<ColumnSpec | ColumnGroupSpec>,
        {
            level,
            headerAlign = 'left',
            groupShowMode,
            headerTooltip,
            ctx
        }: {
            level?: number;
            headerAlign?: HAlign;
            groupShowMode?: ColumnGroupShowMode;
            headerTooltip?: string;
            ctx: Pick<PivotColumnGroupContext, 'path' | 'kind'>;
        }
    ): ColumnGroupSpec {
        const isPivotLevel = level != null,
            spec: PivotColumnGroupSpec = {headerName, headerAlign, headerTooltip},
            overrides = this.columnGroupSpecFn?.({...ctx, spec});
        if (isPivotLevel) this._groupLevels.set(groupId, level);
        return {
            ...spec,
            ...(overrides ? omit(overrides, RESERVED_PIVOT_COLUMN_GROUP_KEYS) : null),
            groupId,
            children,
            groupShowMode,
            collapsed: isPivotLevel && this.groupsCollapsible && !this.isLevelExpanded(level)
        };
    }

    //------------------------
    // Pivot column widths
    //------------------------
    private noteMeasure(colId: string, measure: string): string {
        this._measureByColId.set(colId, measure);
        return colId;
    }

    private widthsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [
                this.gridModel.columnState,
                this.gridModel.columnGroupState,
                this.gridModel.sizingMode,
                this.columnSizing
            ],
            run: () => this.syncPivotWidths()
        };
    }

    // A new sizing needs fresh data widths - turned off, each column's own.
    private sizingReaction(): ReactionSpec {
        return {
            track: () => this.columnSizing,
            equals: 'structural',
            run: () => {
                const {gridModel} = this;
                if (gridModel.autosizeOptions.mode === 'managed') gridModel.autosizeAsync();
            }
        };
    }

    // Every pivot column of a measure shares one width - see `pivotConfig.columnSizing`. An autosize sizes
    // each column to its data, and the measure takes the widest, plus any padding the displayed
    // group labels need. Any other change from the width last applied is a user's resize, which
    // the measure's other columns follow, as is, until the next autosize.
    @action
    private syncPivotWidths() {
        const {gridModel, _colIds, _measureByColId, _widths, _dataWidths, _manualWidths} = this,
            isAutosize = gridModel.autosizeTask.isPending,
            colsByMeasure = groupBy(
                gridModel.columnState.filter(it => _colIds.has(it.colId)),
                it => _measureByColId.get(it.colId)
            );

        // Off, columns size on their own. Applied widths are dropped, so turning it on again
        // takes the columns as they are.
        if (!this.columnSizing) {
            _widths.clear();
            return;
        }

        if (isAutosize) _manualWidths.clear();
        forEach(colsByMeasure, (cols, measure) => {
            const applied = _widths.get(measure),
                changed = cols.find(it => it.width != null && it.width !== applied);
            if (!changed) return;

            if (applied != null && !isAutosize) {
                _manualWidths.set(measure, changed.width);
            } else {
                _dataWidths.set(measure, max(map(cols, 'width')));
            }
        });

        const padding = this.calcLabelPadding(),
            changes: Array<Partial<ColumnState>> = [];
        forEach(colsByMeasure, (cols, measure) => {
            const width = _manualWidths.get(measure) ?? _dataWidths.get(measure) + padding;
            _widths.set(measure, width);
            cols.forEach(({colId, width: w}) => {
                if (w !== width) changes.push({colId, width});
            });
        });

        gridModel.updateColumnState(changes);
    }

    // Width to add to every pivot column for the displayed group labels to fit, each claiming up
    // to `headerFitMaxWidth`.
    // A label short of the columns its group spans shares the shortfall evenly among them.
    private calcLabelPadding(): number {
        const {_regionGroup, _measureByColId, _manualWidths, _dataWidths} = this,
            {columnSizing} = this,
            maxWidth = (isObject(columnSizing) ? columnSizing.headerFitMaxWidth : null) ?? 140;
        if (!maxWidth || !_regionGroup) return 0;

        const {bufferPx} = this.gridModel.autosizeOptions,
            baseWidth = (colId: string) => {
                const measure = _measureByColId.get(colId);
                return _manualWidths.get(measure) ?? _dataWidths.get(measure) ?? 0;
            };

        let ret = 0;
        this.forEachDisplayedGroup(_regionGroup, (label, colIds, isExpandable) => {
            const width = Math.min(this.measureLabel(label, isExpandable) + bufferPx, maxWidth),
                shortfall = width - sumBy(colIds, baseWidth);
            ret = Math.max(ret, Math.ceil(shortfall / colIds.length));
        });
        return ret;
    }

    // Calls fn with each displayed group's label, the columns it spans and whether it shows an
    // expand icon, and returns the columns `group` spans.
    private forEachDisplayedGroup(
        group: ColumnGroupSpec,
        fn: (label: string, colIds: string[], isExpandable: boolean) => void
    ): string[] {
        const hiddenMode = this.gridModel.isColumnGroupExpanded(group.groupId)
            ? 'collapsed'
            : 'expanded';

        const ret: string[] = [];
        let isExpandable = false;
        group.children.forEach(child => {
            if (child.groupShowMode) isExpandable = true;
            if (child.groupShowMode === hiddenMode) return;
            if ('children' in child) {
                ret.push(...this.forEachDisplayedGroup(child, fn));
            } else {
                ret.push(child.colId);
            }
        });
        if (isString(group.headerName) && !isEmpty(ret)) fn(group.headerName, ret, isExpandable);
        return ret;
    }

    private measureLabel(label: string, isExpandable: boolean): number {
        const {sizingMode} = this.gridModel,
            key = `${sizingMode}|${isExpandable}|${label}`;
        let ret = this._labelWidths.get(key);
        if (ret == null) {
            ret = headerMeasurer.calcHeaderTextWidth(sizingMode, label, isExpandable);
            this._labelWidths.set(key, ret);
        }
        return ret;
    }

    // Display only - `result.paths` is immutable.
    private sortPaths(paths: PivotPath[], depth: number): PivotPath[] {
        const spec = this.sortBy[depth] ?? null;

        if (spec === 'asc' || spec === 'desc') return orderBy(paths, 'value', spec);

        if (isFunction(spec)) return [...paths].sort(spec);

        if (isArray(spec)) {
            // One shared key for the unlisted, so the stable sort leaves them in view order.
            return sortBy(paths, it => {
                const idx = spec.indexOf(it.value);
                return idx === -1 ? spec.length : idx;
            });
        }

        return paths;
    }

    // Falls back to the value field's own name, which is exactly the root-path cell field.
    private cellFieldName(path: PivotPath, field: CubeField): string {
        return this._cellFieldNames.get(path)?.get(field.name) ?? field.name;
    }

    private _cellFieldNames: Map<PivotPath, Map<string, string>> = new Map();
    private _rootPath: PivotPath = null;
    private _columnsByField: Record<string, PivotColumnSpec> = {};
    private _colIds: Set<string> = new Set();
    private _groupLevels: Map<string, number> = new Map();
    private _regionGroup: ColumnGroupSpec = null;
    private _measureByColId: Map<string, string> = new Map();
    private _widths: Map<string, number> = new Map();
    private _dataWidths: Map<string, number> = new Map();
    private _manualWidths: Map<string, number> = new Map();
    private _labelWidths: Map<string, number> = new Map();
}

/** Group id of the column group spanning the pivot region. Its summary group is `pivot:total`. */
export const PIVOT_GROUP_ID = 'pivot';

const TOTAL_CELL_CLASS = 'xh-cube-grid__total-cell',
    TOTAL_HEADER_CLASS = 'xh-cube-grid__total-header';

// colId prefixes of the summary columns: under a Total header, and bare while collapsed.
const TOTAL_PREFIX = 'total>>',
    BARE_TOTAL_PREFIX = 'collapsed>>';

// Prepends a class to a class spec, wrapping a class function.
function withClass<T extends (...args: any[]) => Some<string>>(
    spec: T | Some<string>,
    cls: string
): T | string[] {
    return isFunction(spec)
        ? (((...args) => [cls, ...castArray(spec(...args) ?? [])]) as T)
        : [cls, ...castArray(spec ?? [])];
}

// Shared across grids - it holds a hidden header element for measuring.
const headerMeasurer = new ColumnWidthCalculator();

function leafColIds(cols: Array<ColumnSpec | ColumnGroupSpec>): string[] {
    return cols.flatMap(it => ('children' in it ? leafColIds(it.children) : it.colId));
}

function resolveSide<T extends HSide | VSide>(val: boolean | T, dflt: T): T {
    if (val === true) return dflt;
    return val === false ? null : val;
}
