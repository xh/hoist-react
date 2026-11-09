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
import type {Cube, CubeField, PivotCellField, PivotPath, View} from '@xh/hoist/data';
import {action, bindable, bindableRef, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {
    castArray,
    compact,
    find,
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
import type {PivotLinkedSizingOptions, PivotDimensionSpec, PivotMeasureSpec} from './Types';

/**
 * Configuration for the pivot region of a {@link CubeGridModel}, as `gridConfig` is for its
 * GridModel. Applies when the query sets {@link QueryConfig.pivot}.
 *
 * @see CubeGridPivotModel
 */
export interface CubeGridPivotConfig {
    /**
     * The dimensions this grid can pivot on, in the order to offer them, with settings for each
     * over `dimensionDefaults`. A dimension's settings follow it to whatever level the query
     * pivots it at. Entries the query does not pivot on are ignored, and a pivot on a dimension
     * not listed takes the defaults. See {@link CubeGridPivotModel.availableDimensions}.
     */
    dimensions?: PivotDimensionSpec[];

    /**
     * Defaults for every pivot dimension, under its own settings in `dimensions` - sort,
     * collapsing, summaries shown while expanded, labels and classes.
     */
    dimensionDefaults?: Omit<PivotDimensionSpec, 'field'>;

    /**
     * The measures this grid can pivot, in display order, with settings for each over
     * `measureDefaults` - chiefly the column config applied to every pivot column built for it
     * under every path. Measures the query pivots without an entry follow in query order. See
     * {@link CubeGridPivotModel.availableMeasures}.
     *
     * Pivot columns are not hideable and stay out of the column chooser - the region is the
     * query's, so drop a measure from `pivot.measures` to remove its columns.
     */
    measures?: PivotMeasureSpec[];

    /** Defaults for every pivot measure, under its own settings in `measures`. */
    measureDefaults?: Omit<PivotMeasureSpec, 'field'>;

    /**
     * True to put each measure outermost, with the pivot paths beneath it, to compare one measure
     * across paths. Default false, nesting the measures under each path. Applies only with
     * multiple measures - a single measure is always laid out outermost. Outermost, each measure
     * is a root group that collapses to its own row summary, with no group over the whole region,
     * so the header is one level shallower. Leaf paths head their columns directly, and
     * summaries are single columns, so `showCollapsedLabel` has no effect.
     */
    measuresOutermost?: boolean;

    /**
     * True (default) to link every pivot column of a measure to one width, or options to tune it.
     * The width is the measure's widest data, plus an even share of any room a displayed pivot
     * label needs beyond the data of the columns it spans, up to `headerFitMaxWidth`. It follows
     * as groups expand and collapse, and a manual resize moves all of the measure's columns. False
     * to size each column on its own, as in any grid.
     */
    linkedSizing?: boolean | PivotLinkedSizingOptions;

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

    @bindableRef accessor dimensions: PivotDimensionSpec[];
    @bindableRef accessor dimensionDefaults: Omit<PivotDimensionSpec, 'field'>;
    @bindableRef accessor measures: PivotMeasureSpec[];
    @bindableRef accessor measureDefaults: Omit<PivotMeasureSpec, 'field'>;
    @bindable accessor measuresOutermost: boolean;
    @bindableRef accessor linkedSizing: boolean | PivotLinkedSizingOptions;

    private readonly cubeGridModel: CubeGridModel;

    /** @internal - created by {@link CubeGridModel}. */
    constructor(
        {
            dimensions = [],
            dimensionDefaults = null,
            measures = [],
            measureDefaults = null,
            measuresOutermost = false,
            linkedSizing = true,
            expandLevel = -1
        }: CubeGridPivotConfig,
        cubeGridModel: CubeGridModel
    ) {
        super();
        this.cubeGridModel = cubeGridModel;
        this.dimensions = dimensions;
        this.dimensionDefaults = dimensionDefaults;
        this.measures = measures;
        this.measureDefaults = measureDefaults;
        this.measuresOutermost = measuresOutermost;
        this.linkedSizing = linkedSizing;
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

    /**
     * Dimensions to offer for pivoting - those listed in `dimensions`, or all of the cube's
     * dimensions if none are.
     */
    get availableDimensions(): CubeField[] {
        return this.availableFields(this.dimensions, this.cube.dimensions, 'dimension');
    }

    /**
     * Measures to offer for pivoting - those listed in `measures`, or all of the cube's measures
     * if none are.
     */
    get availableMeasures(): CubeField[] {
        return this.availableFields(this.measures, this.cube.measures, 'measure');
    }

    /** @internal - options the built region depends on, tracked by the parent's rebuild. */
    get regionDeps(): unknown[] {
        return [
            this.dimensions,
            this.dimensionDefaults,
            this.measures,
            this.measureDefaults,
            this.measuresOutermost,
            this.linkedSizing
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

    /** @internal - builds the pivot region's root groups, or none when the query has no paths. */
    buildRegion(): ColumnGroupSpec[] {
        const {paths, cellFields} = this.view.result;

        this.indexCellFields(cellFields);

        // Resolved once per rebuild: each dimension's settings, by level, and each measure's
        // column config, stripped of reserved keys.
        const {dimensions, measures, dimensionDefaults, measureDefaults} = this;
        [...dimensions, ...measures].forEach(it =>
            throwIf(!it.field, 'Each pivot `dimensions` and `measures` entry must name a `field`.')
        );
        this._dimensionSpecs = (this.query.pivot?.dimensions ?? []).map(({name}) => ({
            ...DIMENSION_DEFAULTS,
            ...dimensionDefaults,
            ...find(dimensions, {field: name})
        }));
        this._columnsByMeasure = mapValues(keyBy(measures, 'field'), it =>
            omit({...measureDefaults?.column, ...it.column}, RESERVED_COLUMN_KEYS)
        );
        this._defaultColumn = omit(measureDefaults?.column ?? {}, RESERVED_COLUMN_KEYS);

        this._colIds = new Set();
        this._groupLevels = new Map();
        this._measureByColId = new Map();
        this._rootGroups = [];
        this._labelWidths = new Map();
        if (!this.query.isPivoted || isEmpty(paths)) return [];

        // Each root collapses to its row summaries: one group over the whole region, or one per
        // measure. Its header names the first pivot dimension - the level directly beneath it -
        // after the measure when it has one, with every dimension in the tooltip. Both use the
        // fields' short display names, as the header has little room.
        const {_rootPath: rootPath, pivotMeasures} = this,
            dims = this.query.pivot.dimensions.map(it => it.shortDisplayName),
            buildRoot = (fields: CubeField[]) => {
                const measures = fields.map(it => it.shortDisplayName),
                    perMeasure = this.isMeasuresOutermost,
                    labels = perMeasure ? fields.map(it => this.measureHeader(it)) : [],
                    header = perMeasure ? `${measures[0]} by ${dims[0]}` : `By ${dims[0]}`,
                    tooltip = `${measures.join(', ')} by ${dims.join(' › ')}`,
                    pathCols = this.sortPaths(paths, 0).map(path =>
                        this.buildPathColumn(path, labels, [], fields)
                    );
                return this.buildColGroup(
                    this.groupIdFor(PIVOT_GROUP_ID, fields),
                    header,
                    this.buildGroupChildren(pathCols, rootPath, labels, [], fields),
                    {level: 0, headerTooltip: tooltip !== header ? tooltip : null}
                );
            };

        this._rootGroups = this.isMeasuresOutermost
            ? pivotMeasures.map(field => buildRoot([field]))
            : [buildRoot(pivotMeasures)];
        this._colIds = new Set(leafColIds(this._rootGroups));
        return this._rootGroups;
    }

    //------------------------
    // Implementation
    //------------------------

    private get view(): View {
        return this.cubeGridModel.view;
    }

    private get cube(): Cube {
        return this.view.cube;
    }

    private availableFields(specs: {field: string}[], all: CubeField[], kind: string): CubeField[] {
        if (isEmpty(specs)) return all;
        const byName = keyBy(all, 'name');
        return specs.map(({field}) => {
            throwIf(!byName[field], `Pivot ${kind} '${field}' is not a ${kind} of the cube.`);
            return byName[field];
        });
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

    // Each path appears once per measure when measures are outermost, so its group ids carry it.
    // A lone measure laid out outermost keeps the nested ids, so its groups' state carries over
    // when a second measure brings the nested layout back.
    private groupIdFor(id: string, fields: CubeField[]): string {
        return this.measuresOutermost ? `${fields[0].name}::${id}` : id;
    }

    private measureHeader(field: CubeField): string {
        const {headerName} = this.measureColumn(field);
        return isString(headerName) ? headerName : field.displayName;
    }

    private measureColumn(field: CubeField): Partial<ColumnSpec> {
        return this._columnsByMeasure[field.name] ?? this._defaultColumn;
    }

    // The settings of the dimension whose summary a group at this level collapses to - the
    // dimension at the level below it. Defaults beyond the innermost dimension.
    private dimensionSpec(level: number): Omit<PivotDimensionSpec, 'field'> {
        return this._dimensionSpecs[level] ?? DIMENSION_DEFAULTS;
    }

    // With one measure there is nothing to nest, and outermost saves the redundant header row.
    private get isMeasuresOutermost(): boolean {
        return this.measuresOutermost || this.pivotMeasures.length === 1;
    }

    // Measures in `measures` order, then any the app left unconfigured in query order.
    private get pivotMeasures(): CubeField[] {
        const fields = this.query.pivot?.measures ?? [],
            listed = this.measures.map(it => it.field);
        return sortBy(fields, it => {
            const idx = listed.indexOf(it.name);
            return idx === -1 ? listed.length : idx;
        });
    }

    private summarySide(level: number): HSide {
        return resolveSide(this.dimensionSpec(level).showSummary, 'left');
    }

    // A path's value belongs to the dimension at the level above it.
    private pathLabel(path: PivotPath): string {
        const {valueRenderer, emptyLabel} = this.dimensionSpec(path.depth - 1);
        if (path.isEmpty) return emptyLabel;
        return valueRenderer ? valueRenderer(path.value, path) : String(path.value);
    }

    private pathClass(path: PivotPath): string {
        const {valueClass} = this.dimensionSpec(path.depth - 1);
        return isFunction(valueClass)
            ? valueClass(path.isEmpty ? null : path.value, path)
            : valueClass;
    }

    // Keyed on path identity.
    private indexCellFields(cellFields: PivotCellField[]) {
        const byPath = new Map<PivotPath, Map<string, string>>();
        let rootPath: PivotPath = null;

        cellFields.forEach(({name, path, measure}) => {
            if (path.isRoot) rootPath = path;
            let byField = byPath.get(path);
            if (!byField) byPath.set(path, (byField = new Map()));
            byField.set(measure.name, name);
        });

        this._cellFieldNames = byPath;
        this._rootPath = rootPath;
    }

    // The tooltip carries the full path, as an ancestor's header is often scrolled out of view.
    // Each value's class goes to every header and cell beneath it.
    private buildPathColumn(
        path: PivotPath,
        ancestorLabels: string[],
        ancestorClasses: string[],
        fields: CubeField[]
    ): ColumnSpec | ColumnGroupSpec {
        const label = this.pathLabel(path),
            labels = [...ancestorLabels, label],
            classes = compact([...ancestorClasses, this.pathClass(path)]),
            headerTooltip = labels.join(' › ');

        if (isEmpty(path.children)) {
            // With measures outermost the measure heads the root, so a leaf path heads its own column.
            if (this.isMeasuresOutermost) {
                return {
                    ...this.buildValueColumn(path, fields[0], ancestorLabels, classes, label),
                    headerTooltip
                };
            }

            // Otherwise always a group, so the measure name stays visible beside any fixed columns.
            return this.buildColGroup(
                path.key,
                label,
                this.buildValueColumns(path, labels, classes, fields),
                {level: path.depth, headerAlign: 'center', headerTooltip, headerClass: classes}
            );
        }

        const childCols = this.sortPaths(path.children, path.depth).map(child =>
            this.buildPathColumn(child, labels, classes, fields)
        );
        return this.buildColGroup(
            this.groupIdFor(path.key, fields),
            label,
            this.buildGroupChildren(childCols, path, labels, classes, fields),
            {level: path.depth, headerTooltip, headerClass: classes}
        );
    }

    // Children of a group that collapses to its summary. The path groups show expanded. The
    // summary sits under a summary header, always when asked and otherwise only while collapsed.
    // Without that header on collapse, a second copy of the summary shows while collapsed, under
    // colIds of its own, as AG Grid reuses a column's prior group when it moves out of one. AG
    // Grid pads the copy, so the header depth stays fixed. With collapsing off there is only the
    // summary group, only when asked. With measures outermost the summary is one column, under
    // colIds of its own for the same reason.
    private buildGroupChildren(
        pathCols: Array<ColumnSpec | ColumnGroupSpec>,
        summaryPath: PivotPath,
        labels: string[],
        classes: string[],
        fields: CubeField[]
    ): Array<ColumnSpec | ColumnGroupSpec> {
        const {collapsible, summaryLabel, showCollapsedLabel, summaryClass} = this.dimensionSpec(
                summaryPath.depth
            ),
            summarySide = this.summarySide(summaryPath.depth);
        if (!summarySide && !collapsible) return pathCols;

        const children = collapsible
            ? pathCols.map(it => ({...it, groupShowMode: 'expanded' as const}))
            : pathCols;

        if (this.isMeasuresOutermost) {
            const [col] = this.buildSummaryColumns(
                    summaryPath,
                    labels,
                    classes,
                    fields,
                    MEASURE_SUMMARY_PREFIX
                ),
                summary = {...col, groupShowMode: summarySide ? null : ('collapsed' as const)};
            return summarySide === 'left' ? [summary, ...children] : [...children, summary];
        }

        const isBare = collapsible && !showCollapsedLabel,
            summary: Array<ColumnSpec | ColumnGroupSpec> = isBare
                ? this.buildSummaryColumns(
                      summaryPath,
                      labels,
                      classes,
                      fields,
                      BARE_SUMMARY_PREFIX
                  ).map(it => ({
                      ...it,
                      groupShowMode: 'collapsed' as const,
                      excludeFromExport: !!summarySide
                  }))
                : [];

        if (summarySide || !isBare) {
            summary.push(
                this.buildColGroup(
                    `${summaryPath.isRoot ? PIVOT_GROUP_ID : summaryPath.key}:summary`,
                    summaryLabel,
                    this.buildSummaryColumns(summaryPath, labels, classes, fields, SUMMARY_PREFIX),
                    {
                        headerAlign: 'center',
                        groupShowMode: summarySide ? (isBare ? 'expanded' : null) : 'collapsed',
                        headerClass: [SUMMARY_HEADER_CLASS, summaryClass, ...classes]
                    }
                )
            );
        }

        return summarySide === 'left' ? [...summary, ...children] : [...children, ...summary];
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    // A summary column binds the path's own cell but takes a colId of its own, so the root summary
    // never collides with a fixed column bound to the same measure. All carry the summary classes,
    // then the dimension's, then any the app adds.
    // With measures outermost a summary is a lone column, headed by its label.
    private buildSummaryColumns(
        path: PivotPath,
        labels: string[],
        classes: string[],
        fields: CubeField[],
        prefix: string
    ): ColumnSpec[] {
        const {summaryLabel, summaryClass} = this.dimensionSpec(path.depth),
            cols = this.isMeasuresOutermost
                ? fields.map(field =>
                      this.buildValueColumn(path, field, labels, classes, summaryLabel)
                  )
                : this.buildValueColumns(path, [...labels, summaryLabel], classes, fields);
        return cols.map(col => ({
            ...col,
            colId: this.noteMeasure(`${prefix}${col.colId}`, this._measureByColId.get(col.colId)),
            cellClass: withClasses(col.cellClass, [SUMMARY_CELL_CLASS, summaryClass]),
            headerClass: withClasses(col.headerClass, [SUMMARY_HEADER_CLASS, summaryClass])
        }));
    }

    private buildValueColumns(
        path: PivotPath,
        labels: string[],
        classes: string[],
        fields: CubeField[]
    ): ColumnSpec[] {
        return fields.map(field => this.buildValueColumn(path, field, labels, classes));
    }

    // The pivot region is the query's: these columns never move, hide or filter, and the chooser
    // does not list them. A cell is an aggregate, so no query filter can express a condition on
    // it. Field names are built from data values that may contain dots. The export header is the
    // path's labels and the column's header, as the header alone repeats across paths. A
    // `headerName` given here is a pivot label, replacing the spec's. While widths are shared it
    // is fitted as group labels are, not by autosize. Without either, the header is the measure's
    // short name and the export its full one. The value classes go before the measure's.
    private buildValueColumn(
        path: PivotPath,
        field: CubeField,
        labels: string[],
        classes: string[],
        headerName?: string
    ): ColumnSpec {
        const name = this.cellFieldName(path, field),
            spec = this.measureColumn(field),
            isShortName = !headerName && spec.headerName === undefined;
        return {
            ...(headerName && this.linkedSizing ? {autosizeIncludeHeader: false} : null),
            ...spec,
            headerName: isShortName ? field.shortDisplayName : headerName || spec.headerName,
            ...(isEmpty(classes)
                ? null
                : {
                      cellClass: withClasses(spec.cellClass, classes),
                      headerClass: withClasses(spec.headerClass, classes)
                  }),
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
                return [
                    ...labels,
                    !isShortName && isString(header) ? header : field.displayName
                ].join(' › ');
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
            headerClass
        }: {
            level?: number;
            headerAlign?: HAlign;
            groupShowMode?: ColumnGroupShowMode;
            headerTooltip?: string;
            headerClass?: string[];
        }
    ): ColumnGroupSpec {
        const isPivotLevel = level != null,
            classes = compact(headerClass);
        if (isPivotLevel) this._groupLevels.set(groupId, level);
        return {
            headerName,
            headerAlign,
            headerTooltip,
            ...(isEmpty(classes) ? null : {headerClass: classes}),
            groupId,
            children,
            groupShowMode,
            collapsed:
                isPivotLevel &&
                this.dimensionSpec(level).collapsible &&
                !this.isLevelExpanded(level)
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
                this.linkedSizing
            ],
            run: () => this.syncPivotWidths()
        };
    }

    // A new sizing needs fresh data widths - turned off, each column's own - as does a new layout,
    // which changes the cell columns' headers.
    private sizingReaction(): ReactionSpec {
        return {
            track: () => [this.linkedSizing, this.isMeasuresOutermost],
            equals: 'structural',
            run: () => {
                const {gridModel} = this;
                if (gridModel.autosizeOptions.mode === 'managed') gridModel.autosizeAsync();
            }
        };
    }

    // Every pivot column of a measure shares one width - see `linkedSizing`. An autosize
    // sizes each column to its data, and the measure takes the widest, plus any padding the
    // displayed group labels need. Any other change from the width last applied is a user's
    // resize, which the measure's other columns follow, as is, until the next autosize.
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
        if (!this.linkedSizing) {
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
            const width =
                _manualWidths.get(measure) ??
                _dataWidths.get(measure) + (padding.get(measure) ?? 0);
            _widths.set(measure, width);
            cols.forEach(({colId, width: w}) => {
                if (w !== width) changes.push({colId, width});
            });
        });

        gridModel.updateColumnState(changes);
    }

    // Width to add to each measure's columns for the displayed pivot labels to fit, each claiming
    // up to `headerFitMaxWidth`. A label short of the columns it spans shares the shortfall evenly
    // among them, and only the measures it spans take its share.
    private calcLabelPadding(): Map<string, number> {
        const {_rootGroups, _measureByColId, _manualWidths, _dataWidths} = this,
            {linkedSizing} = this,
            maxWidth = (isObject(linkedSizing) ? linkedSizing.headerFitMaxWidth : null) ?? 140,
            ret = new Map<string, number>();
        if (!maxWidth) return ret;

        const {bufferPx} = this.gridModel.autosizeOptions,
            baseWidth = (colId: string) => {
                const measure = _measureByColId.get(colId);
                return _manualWidths.get(measure) ?? _dataWidths.get(measure) ?? 0;
            };

        _rootGroups.forEach(root =>
            this.forEachDisplayedGroup(root, (label, colIds, isExpandable) => {
                const width = Math.min(this.measureLabel(label, isExpandable) + bufferPx, maxWidth),
                    share = Math.ceil((width - sumBy(colIds, baseWidth)) / colIds.length);
                colIds.forEach(colId => {
                    const measure = _measureByColId.get(colId);
                    ret.set(measure, Math.max(ret.get(measure) ?? 0, share));
                });
            })
        );
        return ret;
    }

    // Calls fn with each displayed pivot label, the columns it spans and whether it shows an
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
                // With measures outermost, a column's own header is a pivot label too.
                if (this.isMeasuresOutermost && isString(child.headerName)) {
                    fn(child.headerName, [child.colId], false);
                }
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
    // Paths at a depth are the values of the dimension at that level.
    private sortPaths(paths: PivotPath[], depth: number): PivotPath[] {
        const spec = this.dimensionSpec(depth).sortBy;

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

    // Falls back to the measure's own name, which is exactly the root-path cell field.
    private cellFieldName(path: PivotPath, field: CubeField): string {
        return this._cellFieldNames.get(path)?.get(field.name) ?? field.name;
    }

    private _cellFieldNames: Map<PivotPath, Map<string, string>> = new Map();
    private _rootPath: PivotPath = null;
    private _dimensionSpecs: Omit<PivotDimensionSpec, 'field'>[] = [];
    private _columnsByMeasure: Record<string, Partial<ColumnSpec>> = {};
    private _defaultColumn: Partial<ColumnSpec> = {};
    private _colIds: Set<string> = new Set();
    private _groupLevels: Map<string, number> = new Map();
    private _rootGroups: ColumnGroupSpec[] = [];
    private _measureByColId: Map<string, string> = new Map();
    private _widths: Map<string, number> = new Map();
    private _dataWidths: Map<string, number> = new Map();
    private _manualWidths: Map<string, number> = new Map();
    private _labelWidths: Map<string, number> = new Map();
}

/**
 * Group id of the column group spanning the pivot region. Its summary group is `pivot:summary`. With
 * `measuresOutermost` there is no such group - each measure's root is `{field}::pivot`.
 */
export const PIVOT_GROUP_ID = 'pivot';

// ColumnSpec keys the grid sets on every pivot column, stripped from a measure's `column`.
// Identity and the export header come from the path, and the rest are this model's own.
const RESERVED_COLUMN_KEYS = [
    'colId',
    'isTreeColumn',
    'hidden',
    'hideable',
    'filterable',
    'excludeFromChooser',
    'exportName',
    'enableDotSeparatedFieldPath',
    'omit',
    'pinned',
    'editable',
    'editor',
    'setValueFn',
    'getValueFn',
    'sortValue',
    'agOptions'
] as const;

const SUMMARY_CELL_CLASS = 'xh-cube-grid__summary-cell',
    SUMMARY_HEADER_CLASS = 'xh-cube-grid__summary-header';

// colId prefixes of the summary columns: under a summary header, bare while collapsed, and as the
// lone summary columns with measures outermost.
const SUMMARY_PREFIX = 'summary>>',
    BARE_SUMMARY_PREFIX = 'collapsed>>',
    MEASURE_SUMMARY_PREFIX = 'measureSummary>>';

const DIMENSION_DEFAULTS: Omit<PivotDimensionSpec, 'field'> = {
    sortBy: null,
    collapsible: true,
    showSummary: false,
    summaryLabel: 'Total',
    showCollapsedLabel: true,
    emptyLabel: '(empty)'
};

// Prepends classes to a class spec, wrapping a class function.
function withClasses<T extends (...args: any[]) => Some<string>>(
    spec: T | Some<string>,
    classes: string[]
): T | string[] {
    const pre = compact(classes);
    return isFunction(spec)
        ? (((...args) => [...pre, ...castArray(spec(...args) ?? [])]) as T)
        : [...pre, ...castArray(spec ?? [])];
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
