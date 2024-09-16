/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {CustomCellEditorProps} from '@ag-grid-community/react';
import {div, li, span, ul} from '@xh/hoist/cmp/layout';
import {HAlign, HSide, PlainObject, Some, XH, Thunkable} from '@xh/hoist/core';
import {
    CubeFieldSpec,
    FieldSpec,
    genDisplayName,
    RecordAction,
    RecordActionSpec,
    StoreRecord
} from '@xh/hoist/data';
import {logDebug, logWarn, throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {
    castArray,
    clone,
    find,
    get,
    isArray,
    isEmpty,
    isFinite,
    isFunction,
    isNil,
    isNumber,
    isPlainObject,
    isString,
    keysIn,
    toString
} from 'lodash';
import {
    Attributes,
    createElement,
    forwardRef,
    isValidElement,
    ReactNode,
    useImperativeHandle,
    useLayoutEffect,
    useRef
} from 'react';
import {GridModel} from '../GridModel';
import {GridSorter} from '../GridSorter';
import {getAgHeaderClassFn, managedRenderer} from '../impl/Utils';
import {
    ColumnCellClassFn,
    ColumnCellClassRuleFn,
    ColumnComparator,
    ColumnEditableFn,
    ColumnEditorFn,
    ColumnExcelFormatFn,
    ColumnExportValueFn,
    ColumnGetValueFn,
    ColumnHeaderClassFn,
    ColumnHeaderNameFn,
    ColumnRenderer,
    ColumnSetValueFn,
    ColumnSortSpec,
    ColumnSortValueFn,
    ColumnTooltipFn
} from '../Types';
import {ExcelFormat} from '../enums/ExcelFormat';
import {FunctionComponent} from 'react';
import type {
    ColDef,
    ITooltipParams,
    ValueGetterParams,
    ValueSetterParams
} from '@xh/hoist/kit/ag-grid';

export interface ColumnSpec {
    /**
     * Name of data store field to display within the column, or object containing properties
     * for store field.  If object form is used, the provided properties will be used for
     * auto-creating any fields needed on the Grid's store.
     */
    field?: string | FieldSpec | CubeFieldSpec;

    /**
     * Unique identifier for the Column within its grid. Defaults to field name - one of these
     * two properties must be specified.
     */
    colId?: string;

    /**
     * True if this column will host the expand/collapse arrow controls for a hierarchical
     * Tree Grid. For when `GridModel.treeMode` is enabled, one column in that grid should have
     * this flag enabled.
     */
    isTreeColumn?: boolean;

    /**
     * For ZoneGrids, the left most column will be set to true by Hoist. Similar to
     * isTreeColumn, this flag is used in conjunction with the headerHasExpandCollapse flag to
     * potentially provide a expand/collapse all icon in the column header.
     */
    isLeftZoneColumn?: boolean;

    /**
     * Primary user-facing name for this Column. Sourced from the corresponding data
     * `Field.displayName` from the parent `GridModel.store` config, if available, or defaulted
     * via transform of `field` string config. Used as default value for more specialized
     * `headerName`, `chooserName`, and `exportName` configs. See those configs for additional
     * details and options they support.
     */
    displayName?: string;

    /**
     * User-facing text/element displayed in the Column header, or a function to produce the same.
     * Defaulted from `displayName`.
     */
    headerName?: ColumnHeaderNameFn | ReactNode;

    /** Tooltip text for grid header.*/
    headerTooltip?: string;

    /**
     * True if this column header will host an expand/collapse all icon. `Column.isTreeColumn` or
     * `Column.isLeftZoneColumn` must be enabled. Defaults to true.
     */
    headerHasExpandCollapse?: boolean;

    /** Horizontal alignment of header contents. Defaults to same as cell alignment. */
    headerAlign?: HAlign;

    /** CSS classes to add to the header. Supports both string values or a function to generate strings.*/
    headerClass?: ColumnHeaderClassFn | Some<string>;

    /**
     * Additional CSS classes to add to each cell in the column. Supports both string values or
     * function to generate.NOTE that, once added, classes will *not* be removed if the data changes.
     * Use `cellClassRules` instead if StoreRecord data can change across refreshes
     */
    cellClass?: ColumnCellClassFn | Some<string>;

    /**
     * CSS class names to functions determining if they should be added or removed from the cell.
     * See Ag-Grid docs on "cell styles" for details.
     */
    cellClassRules?: Record<string, ColumnCellClassRuleFn>;

    /** True to suppress default display of the column.*/
    hidden?: boolean;

    /**
     * Flex columns stretch to fill the width of the grid after all columns with a set pixel-width
     * have been sized. If multiple columns have a flex value set, their width will be set in
     * proportion to their flex values. A flex value of `true` is equivalent to 1. Consider pairing
     * a flex setting with min/max pixel widths to avoid your column being squeezed down to the
     * default 50px minimum or stretching so wide that it compromises the overall legibility of
     * the grid.
     */
    flex?: boolean | number;

    /** Default width in pixels.*/
    width?: number;

    /**
     * Minimum width in pixels - grid will block user-driven as well as auto-flex resizing below
     * this value. (Note this is *not* a substitute for width.)
     */
    minWidth?: number;

    /**
     * Maximum width in pixels - grid will block user-driven as well as auto-flex resizing above
     * this value.
     */
    maxWidth?: number;

    /**
     * Row height required by column in pixels - grids can use this to determine an appropriate
     * row height when the column is visible.
     */
    rowHeight?: number;

    /** Horizontal alignment of cell contents. Default is 'left'. */
    align?: HAlign;

    /**
     * The sorting options for this column to be applied by successive clicks on the column header.
     * Specify null to clear the sort on this column.
     */
    sortingOrder?: Array<'asc' | 'desc' | ColumnSortSpec | null>;

    /**
     * True to enable absolute value sorting for this column.  If false (default) absolute value
     * sorts will be ignored when cycling through the sortingOrder.
     */
    absSort?: boolean;

    /**
     * Alternate field name to reference or function to call when producing a value for this column
     * to be sorted by.
     */
    sortValue?: string | ColumnSortValueFn;

    /**
     * Values to match or functions to check to determine if a value should always be sorted
     * to the bottom, regardless of sort order. If more than one entry is provided, values will be
     * sorted according to the order they appear here.
     */
    sortToBottom?: Some<unknown | ((v: unknown) => boolean)>;

    /** Function to compare cell values for sorting.*/
    comparator?: ColumnComparator;

    /** False to prevent user from drag-and-drop resizing. */
    resizable?: boolean;

    /** false to prevent user from sorting on this column. */
    sortable?: boolean;

    /** False to prevent user from drag-and-drop re-ordering. */
    movable?: boolean;

    /**
     * True to enable an Excel-like column header filter menu. Menu option defaults vary based
     * on the underlying Field.type, but include a checkbox-list "values filter" and a custom
     * input filter for more complex queries.
     */
    filterable?: boolean;

    /**
     * False to always show column. Will appear in column chooser but always locked in the
     * displayed collection of columns.
     */
    hideable?: boolean;

    /**
     * Set to true/'left' or 'right' to pin (aka "lock") the column to the side of the grid,
     * ensuring it's visible while horizontally scrolling.
     */
    pinned?: boolean | HSide;

    /** Function returning a React Element for each cell value in this Column.*/
    renderer?: ColumnRenderer;

    /**
     * True if this renderer relies on more than just the value of the field associated with this
     * column. Set to true to ensure that the cells for this column are updated any time the
     * record is changed, but note this can negatively affect update performance. Default false.
     */
    rendererIsComplex?: boolean;

    /**
     * Set to true to call attention to cell changes by flashing the cell's background color.
     */
    highlightOnChange?: boolean;

    /**
     * True to display raw value, or tooltip function.
     */
    tooltip?: boolean | ColumnTooltipFn;

    /**
     * Name to display within the column chooser component. Defaults to `displayName`, can be
     * longer / less abbreviated than `headerName` might be.
     */
    chooserName?: string;

    /**
     * Group name to display within the column chooser component.  Chooser will automatically group
     * its "available columns" grid if any cols provide.
     */
    chooserGroup?: string;

    /**
     * Additional descriptive text to display within the column chooser. Appears when the column
     * is selected within the chooser UI.
     */
    chooserDescription?: string;

    /**
     * True to hide the column from the column chooser completely. Useful for hiding
     * structural columns the user is not expected to adjust.
     */
    excludeFromChooser?: boolean;

    /**
     * Name to use as a header within a file export. Defaults to `headerName`. Useful when
     * `headerName` contains markup or other characters not suitable for use within an Excel or
     * CSV file header.
     */
    exportName?: string | ColumnHeaderNameFn;

    /**
     * Alternate field name to reference or function to call when producing a value for a file
     * export. {@link GridExportService}
     */
    exportValue?: string | ColumnExportValueFn;

    /** True to drop this column from a file export. */
    excludeFromExport?: boolean;

    /** Structured format string for Excel-based exports, or a function to produce one. {@link ExcelFormat} */
    excelFormat?: string | ColumnExcelFormatFn;

    /**
     * Width in characters for Excel-based exports. Typically used with ExcelFormat.LONG_TEXT to
     * enable text wrapping.
     */
    excelWidth?: number;

    /** Allow autosizing this column.*/
    autosizable?: boolean;

    /** True to include the header width when autosizing. */
    autosizeIncludeHeader?: boolean;

    /** True to always include the width of the sort icon when calculating the header width.*/
    autosizeIncludeHeaderIcons?: boolean;

    /** Minimum width in pixels when autosizing.*/
    autosizeMinWidth?: number;

    /** Maximum width in pixels when autosizing.*/
    autosizeMaxWidth?: number;

    /**
     * Additional pixels to add to the size of each column beyond its absolute minimum. If
     * specified, it will override the value of `GridAutosizeOptions.bufferPx` which is applied
     * to all columns.
     */
    autosizeBufferPx?: number;

    /**
     * True to dynamically grow the row height based on the content of this column's cell.  If
     * true, text will also be set to wrap within cells.
     */
    autoHeight?: boolean;

    /**
     * True to make cells in this column editable, or a function to determine on a
     * record-by-record basis.
     */
    editable?: boolean | ColumnEditableFn;

    /**
     * Cell editor Component or a function to create one.  Adding an editor will also
     * install a cellClassRule and tooltip to display the validation state of the cell in question.
     */
    editor?: FunctionComponent | ColumnEditorFn;

    /**
     * True if this cell editor should be rendered as a popup over the cell instead of within the
     * actual cell element. Popup editors will have their width set to match the cell by default.
     * Typically used with textarea cell editors.
     */
    editorIsPopup?: boolean;

    /** Function for updating StoreRecord field for this column after inline editing. */
    setValueFn?: ColumnSetValueFn;

    /** Function for getting the column value. */
    getValueFn?: ColumnGetValueFn;

    /**
     * True (default) to enable configuration of field name as a dot-separated path - e.g.
     * `'country.name'` - where the default `getValueFn` will expect the field to be an object and
     * render a nested property.  False to support field names that contain dots *without*
     * triggering this behavior.
     */
    enableDotSeparatedFieldPath?: boolean;

    /** True to skip this column when adding to grid. */
    omit?: Thunkable<boolean>;

    /**
     * Actions to display as clickable buttons in this column. For action columns only.
     */
    actions?: Array<RecordActionSpec | RecordAction>;

    /**
     * For action columns, hide the Buttons for all rows except the currently hovered row. This can
     * be a used to avoid overloading the user's attention with a wall of buttons when there are
     * many rows + multiple actions per row. Defaults to false;
     */
    actionsShowOnHoverOnly?: boolean;

    /**
     * "escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note these
     * options may be used / overwritten by the framework itself, and are not all guaranteed to be
     * compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: ColDef;

    /** Extra, app-specific data for the column. */
    appData?: PlainObject;
}

/**
 * Cross-platform definition and API for a standardized Grid column.
 * Provided to GridModels as plain configuration objects.
 */
export class Column {
    static DEFAULT_WIDTH = 60;
    static FLEX_COL_MIN_WIDTH = 30;

    /**
     * A convenience sort order. Default for non-numeric, non-date columns.
     */
    static ASC_FIRST: ColumnSortSpec[] = [
        {sort: 'asc', abs: false},
        {sort: 'desc', abs: false}
    ];

    /**
     * A convenience sort order. Default for numeric and date columns.
     */
    static DESC_FIRST: ColumnSortSpec[] = [
        {sort: 'desc', abs: false},
        {sort: 'asc', abs: false}
    ];

    /**
     * A convenience sort order. Default for numeric and date columns where absSort: true.
     */
    static ABS_DESC_FIRST: ColumnSortSpec[] = [
        {sort: 'desc', abs: true},
        {sort: 'asc', abs: false},
        {sort: 'desc', abs: false}
    ];

    field: string;
    enableDotSeparatedFieldPath: boolean;
    fieldPath: Some<string>;
    colId: string;
    isTreeColumn: boolean;
    isLeftZoneColumn: boolean;
    displayName: string;
    headerName: ColumnHeaderNameFn | ReactNode;
    headerTooltip: string;
    headerHasExpandCollapse: boolean;
    headerAlign: HAlign;
    headerClass: ColumnHeaderClassFn | Some<string>;
    cellClass: ColumnCellClassFn | Some<string>;
    cellClassRules: Record<string, ColumnCellClassRuleFn>;
    align: HAlign;
    hidden: boolean;
    flex: boolean | number;
    width: number;
    minWidth: number;
    maxWidth: number;
    rowHeight: number;
    sortingOrder: ColumnSortSpec[];
    absSort: boolean;
    sortValue: string | ColumnSortValueFn;
    sortToBottom: Array<(v: unknown) => boolean>;
    comparator: ColumnComparator;
    resizable: boolean;
    sortable: boolean;
    movable: boolean;
    filterable: boolean;
    hideable: boolean;
    pinned: HSide;
    renderer: ColumnRenderer;
    rendererIsComplex: boolean;
    highlightOnChange: boolean;
    tooltip: boolean | ColumnTooltipFn;
    chooserName: string;
    chooserGroup: string;
    chooserDescription: string;
    excludeFromChooser: boolean;
    exportName: string | ColumnHeaderNameFn;
    exportValue: string | ColumnExportValueFn;
    excludeFromExport: boolean;
    excelFormat: string | ColumnExcelFormatFn;
    excelWidth: number;
    autosizable: boolean;
    autosizeIncludeHeader: boolean;
    autosizeIncludeHeaderIcons: boolean;
    autosizeMinWidth: number;
    autosizeMaxWidth: number;
    autosizeBufferPx: number;
    autoHeight: boolean;
    editable: boolean | ColumnEditableFn;
    editor: FunctionComponent | ColumnEditorFn;
    editorIsPopup: boolean;
    setValueFn: ColumnSetValueFn;
    getValueFn: ColumnGetValueFn;
    actions?: Array<RecordActionSpec | RecordAction>;
    actionsShowOnHoverOnly?: boolean;
    fieldSpec: FieldSpec;
    manuallySized: boolean;
    omit: Thunkable<boolean>;

    gridModel: GridModel;
    agOptions: ColDef;
    appData: PlainObject;

    /**
     * Not for application use. Columns are created internally by Hoist.
     * Applications specify columns by providing ColumnSpec objects to the
     * GridModel API.
     *
     * @internal
     */
    constructor(spec: ColumnSpec, gridModel: GridModel) {
        let {
            field,
            colId,
            isTreeColumn,
            isLeftZoneColumn,
            displayName,
            headerName,
            headerTooltip,
            headerHasExpandCollapse,
            headerAlign,
            headerClass,
            cellClass,
            cellClassRules,
            hidden,
            align,
            width,
            minWidth,
            maxWidth,
            flex,
            rowHeight,
            absSort,
            sortingOrder,
            sortValue,
            sortToBottom,
            comparator,
            resizable,
            movable,
            sortable,
            filterable,
            pinned,
            renderer,
            rendererIsComplex,
            highlightOnChange,
            chooserName,
            chooserGroup,
            chooserDescription,
            excludeFromChooser,
            hideable,
            exportName,
            exportValue,
            excludeFromExport,
            excelFormat,
            excelWidth,
            autosizable,
            autosizeIncludeHeader,
            autosizeIncludeHeaderIcons,
            autosizeMinWidth,
            autosizeMaxWidth,
            autosizeBufferPx,
            autoHeight,
            tooltip,
            editable,
            editor,
            editorIsPopup,
            setValueFn,
            getValueFn,
            enableDotSeparatedFieldPath,
            actionsShowOnHoverOnly,
            actions,
            omit,
            agOptions,
            appData,
            ...rest
        }: ColumnSpec = spec;

        this.field = this.parseField(field);
        this.enableDotSeparatedFieldPath = withDefault(enableDotSeparatedFieldPath, true);
        if (this.field) {
            const splitFieldPath = this.enableDotSeparatedFieldPath && this.field.includes('.');
            this.fieldPath = splitFieldPath ? this.field.split('.') : this.field;
        }

        this.colId = colId || this.field;
        throwIf(!this.colId, 'Must specify colId or field for a Column.');

        this.isTreeColumn = withDefault(isTreeColumn, false);
        this.isLeftZoneColumn = withDefault(isLeftZoneColumn, false);

        // Note that parent GridModel might have already defaulted displayName from an associated
        // `Store.field` when pre-processing Column configs - prior to calling this ctor. If that
        // hasn't happened, displayName will still always be defaulted to a fallback based on colId.
        this.displayName = displayName ?? this.fieldSpec?.displayName ?? genDisplayName(this.colId);

        // In contrast, headerName supports a null or '' value when no header label is desired.
        this.headerName = withDefault(headerName, this.displayName);

        this.headerTooltip = headerTooltip;
        this.headerHasExpandCollapse = withDefault(headerHasExpandCollapse, true);
        this.headerAlign = headerAlign || align;
        this.headerClass = headerClass;

        this.cellClass = cellClass;
        this.cellClassRules = cellClassRules || {};

        this.align = align;
        this.omit = omit;

        this.hidden = withDefault(hidden, false);

        warnIf(
            flex && width,
            `Column '${this.colId}' specified with both flex && width. Width will be ignored.`
        );
        warnIf(
            width && !isFinite(width),
            `Column '${this.colId}' width not specified as a number. Default width will be applied.`
        );

        this.flex = withDefault(flex, false);
        this.width = this.flex ? null : width && isFinite(width) ? width : Column.DEFAULT_WIDTH;
        // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
        this.minWidth = withDefault(minWidth, this.flex ? Column.FLEX_COL_MIN_WIDTH : null);
        this.maxWidth = maxWidth;

        this.rowHeight = rowHeight;

        this.absSort = withDefault(absSort, false);
        this.sortingOrder = this.parseSortingOrder(sortingOrder);
        this.sortValue = sortValue;
        this.sortToBottom = this.parseSortToBottom(sortToBottom);
        this.comparator = comparator;

        this.resizable = withDefault(resizable, true);
        this.sortable = withDefault(sortable, true);
        this.movable = withDefault(movable, true);
        this.filterable = this.parseFilterable(filterable);
        this.hideable = withDefault(hideable, !this.isTreeColumn);
        this.pinned = this.parsePinned(pinned);

        this.renderer = managedRenderer(renderer, this.displayName);
        this.rendererIsComplex = rendererIsComplex;
        this.highlightOnChange = highlightOnChange;

        this.tooltip = tooltip;

        this.chooserName = chooserName || this.displayName;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = withDefault(excludeFromChooser, false);

        // ExportName must be non-empty string. Default to headerName if unspecified (it supports
        // the function form of headerName) and fallback to colId. Note GridExportService can
        // fallback again to colId internally if headerName is or returns an Element.
        this.exportName = exportName || (this.headerName as any) || this.colId;
        this.exportValue = exportValue;
        this.excludeFromExport = withDefault(excludeFromExport, !this.field);

        this.excelFormat = withDefault(excelFormat, ExcelFormat.DEFAULT);
        this.excelWidth = excelWidth ?? null;

        this.autosizable = withDefault(autosizable, this.resizable, true);
        this.autosizeIncludeHeader = withDefault(autosizeIncludeHeader, true);
        this.autosizeIncludeHeaderIcons = withDefault(autosizeIncludeHeaderIcons, true);
        this.autosizeMinWidth = withDefault(autosizeMinWidth, this.minWidth);
        this.autosizeMaxWidth = withDefault(autosizeMaxWidth, this.maxWidth);
        this.autosizeBufferPx = autosizeBufferPx;

        this.autoHeight = withDefault(autoHeight, false);

        this.editable = editable || false;
        this.editor = editor;
        this.editorIsPopup = editorIsPopup;
        this.setValueFn = withDefault(setValueFn, this.defaultSetValueFn);
        this.getValueFn = withDefault(getValueFn, this.defaultGetValueFn);

        this.actions = actions;
        this.actionsShowOnHoverOnly = actionsShowOnHoverOnly ?? false;

        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};
        this.appData = appData ? clone(appData) : {};

        // Warn if using the ag-Grid valueSetter or valueGetter and recommend using our callbacks
        warnIf(
            this.agOptions.valueSetter,
            `Column '${this.colId}' uses valueSetter through agOptions. Remove and use custom setValueFn if needed.`
        );
        warnIf(
            this.agOptions.valueGetter,
            `Column '${this.colId}' uses valueGetter through agOptions. Remove and use custom getValueFn if needed.`
        );

        if (!isEmpty(rest)) {
            const keys = keysIn(rest);
            throw XH.exception(
                `Column '${this.colId}' configured with unsupported key(s) '${keys}'. Custom config data must be nested within the 'appData' property.`
            );
        }
    }

    /** Does column support editing its field for the given StoreRecord? */
    isEditableForRecord(record: StoreRecord): boolean {
        const {editable, gridModel} = this;
        if (!record) return false;
        return isFunction(editable)
            ? editable({record, store: record.store, gridModel, column: this})
            : editable;
    }

    /** A Column definition appropriate for AG-Grid. */
    getAgSpec(): ColDef {
        const {gridModel, field, headerName, displayName, agOptions} = this,
            ret: ColDef = {
                field,
                colId: this.colId,
                // headerValueGetter should always return a string
                // for display in draggable shadow box, aGrid Tool panel.
                // Hoist ColumnHeader will handle display of Element values in the header.
                headerValueGetter: agParams => {
                    let ret = isFunction(headerName)
                        ? headerName({column: this, gridModel, agParams})
                        : headerName;
                    return isString(ret) ? ret : displayName;
                },
                headerClass: getAgHeaderClassFn(this),
                headerTooltip: this.headerTooltip,
                hide: this.hidden,
                minWidth: this.minWidth,
                maxWidth: this.maxWidth,
                resizable: this.resizable,
                sortable: false, // Prevent ag-Grid built-in sorting affordances.  Our custom header provides.
                suppressMovable: !this.movable,
                lockPinned: !gridModel.enableColumnPinning || XH.isMobileApp,
                pinned: this.pinned,
                lockVisible: !this.hideable || !gridModel.colChooserModel || XH.isMobileApp,
                headerComponentParams: {xhColumn: this},
                suppressColumnsToolPanel: this.excludeFromChooser,
                suppressFiltersToolPanel: this.excludeFromChooser,
                enableCellChangeFlash: this.highlightOnChange,
                cellClassRules: this.cellClassRules,
                editable: agParams => this.isEditableForRecord(agParams.node.data),
                valueSetter: (agParams: ValueSetterParams) => {
                    const record = agParams.data;
                    this.setValueFn({
                        value: agParams.newValue,
                        record,
                        field,
                        store: record?.store,
                        column: this,
                        gridModel,
                        agParams
                    });
                    return true;
                },
                valueGetter: (agParams: ValueGetterParams) => {
                    const record = agParams.data;
                    return this.getValueFn({
                        record,
                        field,
                        store: record?.store,
                        column: this,
                        gridModel
                    });
                },
                suppressKeyboardEvent: ({editing, event}) => {
                    if (!editing) return false;

                    // Avoid stomping on react-select menus in editors
                    const {gridModel, colId} = this,
                        editor = gridModel.agApi.getCellEditorInstances({columns: [colId]})[0],
                        // @ts-ignore -- private
                        reactSelect = editor?.componentInstance?.reactSelect;
                    if (reactSelect?.state.menuIsOpen) return true;

                    // Allow shift+enter to add newlines in certain editors
                    if (event.shiftKey && event.key === 'Enter') return true;

                    return false;
                }
            };

        // We will change this setter as needed to install the renderer in the proper location
        // for cases like tree columns where we need to set the inner renderer on the default ag-Grid
        // group cell renderer, instead of on the top-level column itself
        let setRenderer = r => (ret.cellRenderer = r);

        // Our implementation of Grid.getDataPath() > StoreRecord.treePath returns data path []s of
        // StoreRecord IDs. TreeColumns use those IDs as their cell values, regardless of field.
        // Add valueGetters below to correct + additional fixes for sorting below.
        if (this.isTreeColumn) {
            ret.showRowGroup = true;
            ret.cellRenderer = 'agGroupCellRenderer';
            ret.cellRendererParams = {
                suppressCount: true,
                suppressDoubleClickExpand: true
            };

            setRenderer = r => (ret.cellRendererParams.innerRenderer = r);
        }

        // By always providing a minimal pass-through cellRenderer, we can ensure the
        // cell contents are wrapped in a span for styling purposes. We check agOptions in case
        // the dev has specified a renderer option directly against the ag-Grid API.
        const {renderer} = this;
        if (!agOptions.cellRenderer) {
            setRenderer(agParams => {
                let ret = renderer
                    ? renderer(agParams.value, {record: agParams.data, column: this, gridModel})
                    : agParams.value;

                ret = isNil(ret) || isValidElement(ret) ? ret : toString(ret);

                // Add wrapping span for styling purposes
                return span({className: 'xh-cell-inner-wrapper', item: ret});
            });
        }

        // Tooltip Handling
        const {tooltip, editor} = this;
        if (tooltip || editor) {
            // ag-Grid requires a return from getter, but value we actually use is computed below
            ret.tooltipValueGetter = () => 'tooltip';
            ret.tooltipComponent = forwardRef((agParams: ITooltipParams, ref) => {
                const {location, data: record} = agParams,
                    hasRecord = record instanceof StoreRecord,
                    wrapperRef = useRef<HTMLDivElement>(null);

                let ret = null;
                if (hasRecord) {
                    const {store} = record,
                        val = this.getValueFn({
                            record,
                            field,
                            column: this,
                            gridModel,
                            store
                        });

                    if (isFunction(tooltip)) {
                        try {
                            ret = tooltip(val, {record, gridModel, agParams, column: this});
                        } catch (e) {
                            logWarn([`Failure in tooltip for '${this.displayName}'`, e], 'Column');
                        }
                    } else {
                        ret = val;
                    }
                }

                const isElement = isValidElement(ret);

                useLayoutEffect(() => {
                    const xhToolTipClassNames: string[] =
                        location === 'header'
                            ? ['ag-tooltip']
                            : [
                                  'xh-grid-tooltip',
                                  isElement ? 'xh-grid-tooltip--custom' : 'xh-grid-tooltip--default'
                              ];
                    wrapperRef.current
                        ?.closest('.ag-react-container')
                        .classList.add(...xhToolTipClassNames);
                }, [isElement, location]);

                // Required by agGrid, even though empty.
                // If not present agGrid logs this warning:
                // "If the component is using `forwardRef` but not `useImperativeHandle`, add the following: `useImperativeHandle(ref, () => ({}));"
                useImperativeHandle(ref, () => ({}), []);

                if (location === 'header') return div({ref: wrapperRef, item: this.headerTooltip});
                if (!hasRecord) return null;

                // Override with validation errors, if present
                if (editor) {
                    const errors = record.errors[field];
                    if (!isEmpty(errors)) {
                        return div({
                            ref: wrapperRef,
                            item: ul({
                                className: classNames(
                                    'xh-grid-tooltip--validation',
                                    errors.length === 1
                                        ? 'xh-grid-tooltip--validation--single'
                                        : null
                                ),
                                items: errors.map((it, idx) => li({key: idx, item: it}))
                            })
                        });
                    }
                    if (!tooltip) return null;
                }

                if (isNil(ret) || ret === '') return null;

                return div({
                    ref: wrapperRef,
                    item: (isElement ? ret : toString(ret)) as any
                });
            });
        }

        // Generate CSS classes for cells.
        // Default alignment classes are mixed in with any provided custom classes.
        const {cellClass, isTreeColumn, align} = this;
        ret.cellClass = agParams => {
            let r = [];
            if (cellClass) {
                r = castArray(
                    isFunction(cellClass)
                        ? cellClass(agParams.value, {
                              record: agParams.data,
                              column: this,
                              gridModel,
                              agParams
                          })
                        : cellClass
                );
            }
            if (isTreeColumn) {
                r.push('xh-tree-column');
            }
            if (align === 'center' || align === 'right') {
                r.push('xh-align-' + align);
            }
            return r;
        };

        if (this.flex) {
            ret.resizable = false;
            ret.flex = isNumber(this.flex) ? this.flex : 1;
        } else {
            ret.suppressSizeToFit = true;
            ret.width = this.width;
        }

        const sortCfg = find(gridModel.sortBy, {colId: ret.colId});
        if (sortCfg) {
            ret.sort = sortCfg.sort;
            ret.sortIndex = gridModel.sortBy.indexOf(sortCfg);
        }

        if (this.comparator === undefined) {
            // Use default comparator with appropriate inputs
            ret.comparator = (valueA, valueB, agNodeA, agNodeB) => {
                const {gridModel, colId} = this,
                    // Note: sortCfg and agNodes can be undefined if comparator called during show
                    // of agGrid column header set filter menu.
                    sortCfg = find(gridModel.sortBy, {colId}),
                    sortDir = sortCfg?.sort || 'asc',
                    recordA = agNodeA?.data,
                    recordB = agNodeB?.data;

                valueA = this.getSortValue(valueA, recordA);
                valueB = this.getSortValue(valueB, recordB);

                const sortToBottom = this.sortToBottomComparator(valueA, valueB, sortDir);
                if (sortToBottom !== 0) return sortToBottom;

                return this.defaultComparator(valueA, valueB);
            };
        } else {
            // ...or process custom comparator with the Hoist-defined comparatorFn API.
            ret.comparator = (valueA, valueB, agNodeA, agNodeB) => {
                const {gridModel, colId} = this,
                    // Note: sortCfg and agNodes can be undefined if comparator called during show
                    // of agGrid column header set filter menu.
                    sortCfg = find(gridModel.sortBy, {colId}),
                    sortDir = sortCfg?.sort || 'asc',
                    abs = sortCfg?.abs || false,
                    recordA = agNodeA?.data as StoreRecord,
                    recordB = agNodeB?.data as StoreRecord,
                    params = {
                        recordA,
                        recordB,
                        column: this as Column,
                        gridModel,
                        defaultComparator: this.defaultComparator,
                        agNodeA,
                        agNodeB
                    };

                valueA = this.getSortValue(valueA, recordA);
                valueB = this.getSortValue(valueB, recordB);

                const sortToBottom = this.sortToBottomComparator(valueA, valueB, sortDir);
                if (sortToBottom !== 0) return sortToBottom;

                return this.comparator(valueA, valueB, sortDir, abs, params);
            };
        }

        if (this.autoHeight) {
            ret.autoHeight = true;
            ret.wrapText = true;
        }

        if (editor) {
            ret.cellEditor = forwardRef((agParams: CustomCellEditorProps, ref) => {
                const props = {
                    record: agParams.data as StoreRecord,
                    gridModel,
                    column: this,
                    agParams,
                    ref
                };
                // Can be a component or elem factory/ ad-hoc render function.
                if ((editor as any).isHoistComponent)
                    return createElement(editor, props as Attributes);
                if (isFunction(editor)) return editor(props);
                throw XH.exception('Column editor must be a HoistComponent or a render function');
            });
            ret.cellEditorPopup = this.editorIsPopup;
            ret.cellClassRules = {
                'xh-cell--invalid': agParams => {
                    const record = agParams.data;
                    return record && !isEmpty(record.errors[field]);
                },
                'xh-cell--editable': agParams => {
                    return this.isEditableForRecord(agParams.data);
                },
                ...ret.cellClassRules
            };
        }

        // Finally, apply explicit app requests.  The customer is always right....
        return {...ret, ...agOptions};
    }

    //--------------------
    // Implementation
    //--------------------
    // Default comparator sorting to absValue-aware GridSorters in GridModel.sortBy[].
    private defaultComparator = (v1, v2) => {
        const sortCfg = find(this.gridModel.sortBy, {colId: this.colId});
        return sortCfg ? sortCfg.comparator(v1, v2) : GridSorter.defaultComparator(v1, v2);
    };

    private sortToBottomComparator = (v1, v2, sortDir: 'asc' | 'desc') => {
        const {sortToBottom} = this;

        if (isNil(sortToBottom)) return 0;

        for (let fn of sortToBottom) {
            const v1ToBottom = fn(v1),
                v2ToBottom = fn(v2);
            const isAsc = sortDir === 'asc';
            if (v1ToBottom != v2ToBottom) {
                return v1ToBottom ? (isAsc ? 1 : -1) : isAsc ? -1 : 1;
            }
        }

        return 0;
    };

    private defaultSetValueFn = ({value, record, store, field}) => {
        const data = {id: record.id};
        data[field] = value;
        store.modifyRecords(data);
    };

    defaultGetValueFn = ({record}) => {
        const {fieldPath} = this;
        if (!record || isNil(fieldPath)) return '';

        if (isArray(fieldPath)) return get(record.data, fieldPath);
        return record.data[fieldPath];
    };

    private parseField(field) {
        if (isPlainObject(field)) {
            this.fieldSpec = field;
            return field.name;
        }
        return field;
    }

    private parsePinned(pinned) {
        if (pinned === true) return 'left';
        if (pinned === 'left' || pinned === 'right') return pinned;
        return null;
    }

    private parseSortingOrder(sortingOrder): ColumnSortSpec[] {
        return sortingOrder?.map(spec => (isString(spec) || spec === null ? {sort: spec} : spec));
    }

    private parseSortToBottom(sortToBottom): Array<(v: unknown) => boolean> {
        if (isNil(sortToBottom)) return null;
        return castArray(sortToBottom).map(v => (isFunction(v) ? v : it => it === v));
    }

    private parseFilterable(filterable) {
        if (!filterable) return false;
        const {colId} = this;

        if (XH.isMobileApp) {
            logDebug(
                `Column ${colId} specs 'filterable' but not supported on mobile - will be ignored.`,
                this
            );
            return false;
        }

        if (!this.field) {
            logWarn(`Column ${colId} is not a Store field. 'filterable' will be ignored.`, this);
            return false;
        }

        if (this.field === 'cubeLabel') {
            logWarn(`Column ${colId} is a cube label column. 'filterable' will be ignored.`, this);
            return false;
        }

        return true;
    }

    private getSortValue(v, record) {
        const {sortValue, gridModel} = this;
        if (!sortValue) return v;

        return isFunction(sortValue)
            ? sortValue(v, {record, column: this, gridModel})
            : record?.data[sortValue] ?? v;
    }
}
