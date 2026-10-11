/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {elementFactory, hoistCmp, HoistProps, LayoutProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {HoistIconPrefix, Icon, IconCatalogEntry, IconFactory} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {action, bindable, computed, observable, observableRef} from '@xh/hoist/mobx';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, union, uniqBy} from 'lodash';
import type {CSSProperties, KeyboardEvent} from 'react';
import {useEffect} from 'react';
import type {ListImperativeAPI, RowComponentProps} from 'react-window';
import {getScrollbarSize, List} from 'react-window';
import {textInput} from './TextInput';
import './IconPicker.scss';

export interface IconPickerProps extends HoistProps, HoistInputProps, LayoutProps, StyleProps {
    /** Props forwarded to the trigger button - see {@link ButtonProps}. */
    buttonProps?: Partial<ButtonProps>;

    /** Number of icons per row in the popover grid. Defaults to 8. */
    columns?: number;

    /** True to render in a compact mode with reduced sizing for space-constrained contexts. */
    compact?: boolean;

    /** True (default) to offer a "Clear" action in the popover footer. */
    enableClear?: boolean;

    /** True (default) to include a text filter input at the top of the popover. */
    enableFilter?: boolean;

    /**
     * Icons to offer, as either FA names or {@link Icon} factory names. Defaults to the full
     * catalog of icons known to Hoist - its built-in set plus any registered by the app via
     * {@link Icon.register}.
     */
    icons?: string[];

    /** Maximum height of the icon grid before scrolling. Defaults to 260. */
    maxMenuHeight?: number;

    /** Text shown on the trigger button when no icon is selected. Defaults to 'Select icon...' */
    placeholder?: string;

    /**
     * True to render a minimal popover without an arrow or visual separation from the trigger.
     * Defaults to false.
     */
    popoverMinimal?: boolean;

    /** Placement of the popover relative to the trigger. Defaults to 'bottom-left'. */
    popoverPosition?: string;

    /**
     * Weight / family style used to render icons in this control. Defaults to 'far'. Note icons
     * not registered in the requested weight will render in their default weight instead.
     */
    prefix?: HoistIconPrefix;

    /** True (default) to render the selected icon's name alongside its glyph on the trigger. */
    showName?: boolean;

    /** True (default) to style trigger button background and borders to match inputs. */
    styleButtonAsInput?: boolean;

    /**
     * Form of name this control emits as its value. Defaults to `'faName'`.
     *
     * - `'faName'` emits the FontAwesome name of the glyph (e.g. `'cog'`). It names exactly the
     *   glyph the user chose, and no change the app makes to its own `Icon` names affects it.
     * - `'name'` emits an `Icon` name (e.g. `'gear'`, or an app name such as `'businessRule'`).
     *   A stored value follows the app if it later points that name at another glyph via
     *   `Icon.register({replace: true})`. Renaming the registration orphans stored values.
     *
     * With `'name'`, every name listed in `icons` is its own option, even when several names
     * share a glyph. Both forms render back with `Icon.get(value)`, and the control shows a stored
     * value of either form as selected.
     */
    valueField?: 'faName' | 'name';
}

/**
 * An input for selecting an icon, rendered as a compact trigger button that opens a searchable
 * grid of the icons known to Hoist.
 *
 * The offered icons are sourced from {@link Icon.getCatalog} - Hoist's own built-in set, plus any
 * custom icons the app has registered via {@link Icon.register}. Apps therefore get their own
 * icons in this picker for free, with no additional wiring.
 *
 * The control's value is a name for the selected icon, rendered back via `Icon.get(value)`. By
 * default it is the icon's FontAwesome name (e.g. `'cog'`). Set `valueField: 'name'` to emit an
 * `Icon` name instead (e.g. `'gear'`, or an app name such as `'businessRule'`).
 */
export const [IconPicker, iconPicker] = hoistCmp.withFactory<IconPickerProps>({
    displayName: 'IconPicker',
    className: 'xh-icon-picker',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, IconPickerModel);
    }
});
(IconPicker as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
const buttonEl = elementFactory('button');
const reactWindowList = elementFactory(List);

// Cell sizes in px, set here rather than in CSS as the windowed grid needs exact row heights.
const CELL_SIZE = 30,
    COMPACT_CELL_SIZE = 24,
    CELL_GAP = 2;

/** One cell in the picker grid. */
interface IconOption {
    /** Value the control emits when this option is chosen. */
    value: string;
    /** Catalog entry for the glyph. Several options can share one, in `valueField: 'name'` mode. */
    entry: IconCatalogEntry;
    displayName: string;
    factory: IconFactory;
    /** Lowercase text the filter matches against - names, aliases and keywords. */
    searchText: string;
}

class IconPickerModel extends HoistInputModel {
    override xhImpl = true;

    @observable accessor popoverIsOpen: boolean = false;
    @bindable accessor filterValue: string = '';

    /**
     * Snapshot of the icon catalog, refreshed each time the popover opens. Picks up icons the app
     * registered since, while keeping options stable as the user hovers and filters.
     */
    @observableRef accessor catalog: IconCatalogEntry[] = Icon.getCatalog();

    /** Index within `filteredOptions` of the keyboard-highlighted icon. */
    @observable accessor activeIdx: number = 0;

    listRef = createObservableRef<ListImperativeAPI>();
    menuRef = createObservableRef<HTMLElement>();

    /** True from opening the popover until its grid has centered the highlighted icon. */
    private centerOnOpen = false;

    get valueField(): 'faName' | 'name' {
        return withDefault(this.componentProps.valueField, 'faName');
    }

    /** Icons offered by this control, before any text filter is applied. */
    @computed
    get options(): IconOption[] {
        const {catalog} = this,
            {icons} = this.componentProps,
            names = isEmpty(icons)
                ? catalog.filter(it => !it.hideFromPicker).map(it => it.faName)
                : icons;
        return uniqBy(compact(names.map(it => this.toOption(it))), 'value');
    }

    /** Icons matching the current filter. */
    @computed
    get filteredOptions(): IconOption[] {
        const {options} = this,
            // Filter input commits null when cleared or emptied.
            terms = (this.filterValue ?? '').toLowerCase().split(/\s+/).filter(Boolean);

        if (isEmpty(terms)) return options;
        return options.filter(it => terms.every(term => it.searchText.includes(term)));
    }

    /**
     * Option for the current value. A value stored in the other form of name matches the option
     * for the same glyph. A value not on offer still renders on the trigger.
     */
    @computed
    get selectedOption(): IconOption {
        const {renderValue} = this;
        if (!renderValue) return null;

        const {options} = this,
            entry = Icon.getCatalogEntry(renderValue);
        return (
            options.find(it => it.value === renderValue) ??
            options.find(it => it.entry === entry) ??
            this.toOption(renderValue)
        );
    }

    /** Option described in the popover footer - the keyboard-highlighted icon, else the selection. */
    get activeOption(): IconOption {
        return this.filteredOptions[this.activeIdx] ?? this.selectedOption;
    }

    get enableClear(): boolean {
        return withDefault(this.componentProps.enableClear, true);
    }

    get columns(): number {
        return withDefault(this.componentProps.columns, 8);
    }

    get maxMenuHeight(): number {
        return this.componentProps.maxMenuHeight ?? 260;
    }

    get cellSize(): number {
        return this.componentProps.compact ? COMPACT_CELL_SIZE : CELL_SIZE;
    }

    /** Height of one grid row, including the gap below it. */
    get rowHeight(): number {
        return this.cellSize + CELL_GAP;
    }

    get rowCount(): number {
        return Math.ceil(this.filteredOptions.length / this.columns);
    }

    /** Height of the scrolling grid - its rows, up to `maxMenuHeight`. */
    get gridHeight(): number {
        return Math.min(this.rowCount * this.rowHeight, this.maxMenuHeight);
    }

    override onLinked() {
        this.addReaction(
            {
                // Restart the highlight at the first match whenever the filter changes.
                track: () => this.filterValue,
                run: () => this.setActiveIdx(0)
            },
            {
                // Center the highlighted icon once the opened grid is in the DOM. The list sets its
                // handle before its element, and can scroll only once it has both.
                track: () => this.listRef.current,
                run: list => {
                    if (!this.centerOnOpen || !list?.element) return;
                    this.centerOnOpen = false;
                    this.scrollToActive('center');
                }
            }
        );
    }

    /**
     * Scroll the grid to the highlighted icon's row. `auto` scrolls the least distance needed, and
     * does nothing if the row is already in view.
     */
    scrollToActive(align: 'auto' | 'center') {
        const row = Math.floor(this.activeIdx / this.columns);
        if (row < this.rowCount) this.listRef.current?.scrollToRow({index: row, align});
    }

    /** Focus is held by the trigger button - the popover's filter input takes over when open. */
    override focus() {
        this.domEl?.focus();
    }

    override blur() {
        this.domEl?.blur();
    }

    @action
    openPopover() {
        this.catalog = Icon.getCatalog();
        this.popoverIsOpen = true;
        this.filterValue = '';
        this.centerOnOpen = true;
        const selectedValue = this.selectedOption?.value;
        this.activeIdx = Math.max(
            this.filteredOptions.findIndex(it => it.value === selectedValue),
            0
        );
    }

    @action
    closePopover() {
        this.popoverIsOpen = false;
        this.filterValue = '';
    }

    @action
    onPopoverInteraction(nextOpen: boolean) {
        if (nextOpen) {
            this.openPopover();
        } else {
            this.closePopover();
        }
    }

    @action
    setActiveIdx(idx: number) {
        this.activeIdx = idx;
    }

    onIconClick(option: IconOption) {
        this.noteValueChange(option.value);
        this.closePopover();
    }

    /** Resolve an `Icon` or FA name to an option emitting the form set by `valueField`. */
    toOption(name: string): IconOption {
        const entry = Icon.getCatalogEntry(name);
        if (!entry) return null;

        if (this.valueField === 'faName') {
            const {faName, displayName, factory} = entry;
            return withSearchText({value: faName, entry, displayName, factory});
        }

        // Keep an `Icon` name as given, so names that share a glyph stay distinct options.
        const value = name === entry.faName ? entry.name : name;
        return withSearchText({
            value,
            entry,
            displayName: Icon.getDisplayName(value),
            factory: Icon.getFactory(value)
        });
    }

    clear() {
        this.noteValueChange(null);
        this.closePopover();
    }

    /**
     * Arrow keys move the highlight through the grid, page up and page down move it a grid height
     * at a time, enter selects it, and escape closes the popover - all handled from the filter
     * input, so users can type and navigate without moving focus.
     */
    @action
    onKeyDown = (e: KeyboardEvent) => {
        const {filteredOptions, columns, activeIdx} = this,
            {length} = filteredOptions,
            pageSize = Math.max(Math.floor(this.gridHeight / this.rowHeight), 1) * columns;

        switch (e.key) {
            case 'Escape':
                this.closePopover();
                return;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[activeIdx]) this.onIconClick(filteredOptions[activeIdx]);
                return;
            case 'ArrowLeft':
                this.activeIdx = clamp(activeIdx - 1, length);
                break;
            case 'ArrowRight':
                this.activeIdx = clamp(activeIdx + 1, length);
                break;
            case 'ArrowUp':
                this.activeIdx = clamp(activeIdx - columns, length);
                break;
            case 'ArrowDown':
                this.activeIdx = clamp(activeIdx + columns, length);
                break;
            case 'PageUp':
                this.activeIdx = clamp(activeIdx - pageSize, length);
                break;
            case 'PageDown':
                this.activeIdx = clamp(activeIdx + pageSize, length);
                break;
            default:
                return;
        }
        e.preventDefault();
    };
}

function clamp(idx: number, length: number): number {
    if (!length) return 0;
    return Math.min(Math.max(idx, 0), length - 1);
}

function withSearchText(option: Omit<IconOption, 'searchText'>): IconOption {
    const {value, displayName, entry} = option;
    return {
        ...option,
        searchText: union([displayName, value], entry.names, entry.keywords).join(' ').toLowerCase()
    };
}

//---------------------------------------------
// Inner render component
//---------------------------------------------
const cmp = hoistCmp.factory<IconPickerModel>(({model, className, ...props}, ref) => {
    const compact = !!props.compact;

    return popover({
        className: classNames(className, compact && 'xh-icon-picker--compact'),
        isOpen: model.popoverIsOpen,
        onInteraction: nextOpen => model.onPopoverInteraction(nextOpen),
        // Without a filter input to take focus, focus the menu itself so keyboard nav works.
        onOpened: () => {
            if (props.enableFilter === false) model.menuRef.current?.focus();
        },
        minimal: withDefault(props.popoverMinimal, false),
        position: withDefault(props.popoverPosition, 'bottom-left'),
        popoverClassName: classNames(
            'xh-icon-picker__popover',
            compact && 'xh-icon-picker__popover--compact'
        ),
        item: triggerButton({model, props, ref}),
        content: iconMenu({model, props}),
        [TEST_ID]: props.testId
    });
});

//---------------------------------------------
// Trigger button
//---------------------------------------------
const triggerButton = hoistCmp.factory<IconPickerModel>(({model, props}, ref) => {
    const {selectedOption} = model,
        {width, ...restLayout} = getLayoutProps(props),
        btnProps = props.buttonProps ?? {},
        styleAsInput = withDefault(props.styleButtonAsInput, true),
        showName = withDefault(props.showName, true),
        prefix = props.prefix;

    return button({
        minimal: true,
        outlined: !styleAsInput,
        rightIcon: Icon.chevronDown(),
        ...btnProps,
        ref,
        className: classNames(
            'xh-icon-picker__trigger',
            styleAsInput && 'xh-icon-picker__trigger--as-input',
            !selectedOption && 'xh-icon-picker__trigger--empty',
            btnProps.className
        ),
        // Without a name, hold the icon's space so an empty trigger does not collapse.
        icon: selectedOption?.factory({prefix}) ?? (showName ? null : Icon.placeholder()),
        text: showName
            ? (selectedOption?.displayName ?? withDefault(props.placeholder, 'Select icon...'))
            : null,
        disabled: props.disabled,
        active: model.popoverIsOpen,
        tabIndex: props.tabIndex,
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        ...restLayout,
        width: withDefault(width, showName ? 160 : null),
        style: props.style,
        [TEST_ID]: getTestId(props, 'trigger'),
        ...props.domAttrs,
        onClick: () => {
            if (model.popoverIsOpen) {
                model.closePopover();
            } else {
                model.openPopover();
            }
        }
    });
});

//---------------------------------------------
// Popover content - filter, icon grid, footer
//---------------------------------------------
const iconMenu = hoistCmp.factory<IconPickerModel>(({model, props}) => {
    const enableFilter = withDefault(props.enableFilter, true);

    return div({
        className: 'xh-icon-picker__menu',
        ref: model.menuRef,
        onKeyDown: model.onKeyDown,
        // Keyboard nav is driven from whatever holds focus within the popover - the filter input
        // when present, otherwise this container itself (focused on open - see `onOpened`).
        tabIndex: enableFilter ? null : 0,
        items: [
            div({
                omit: !enableFilter,
                className: 'xh-icon-picker__filter',
                item: textInput({
                    model,
                    bind: 'filterValue',
                    commitOnChange: true,
                    leftIcon: Icon.search(),
                    enableClear: true,
                    placeholder: 'Filter icons...',
                    autoFocus: true,
                    width: '100%',
                    testId: getTestId(props, 'filter')
                })
            }),
            iconGrid({model, props}),
            menuFooter({model, props})
        ]
    });
});

/**
 * Grid of icon cells, windowed by row with react-window - only the rows in or near view render, so
 * the picker stays fast with thousands of icons.
 */
const iconGrid = hoistCmp.factory<IconPickerModel>(({model, props}) => {
    const {filteredOptions, activeIdx, columns, cellSize, gridHeight} = model;

    // Keep the highlighted icon in view as it moves - see also `centerOnOpen`. Run as an effect, not
    // a reaction, so the list has rendered any new rows before scrolling to one.
    useEffect(() => model.scrollToActive('auto'), [model, activeIdx, filteredOptions]);

    if (isEmpty(filteredOptions)) {
        return div({className: 'xh-icon-picker__no-results', item: 'No matching icons found.'});
    }

    // Size the list to its columns, plus room for a scrollbar so one never covers the last column.
    const rowWidth = columns * cellSize + (columns - 1) * CELL_GAP;

    return div({
        className: 'xh-icon-picker__grid',
        item: reactWindowList({
            className: 'xh-icon-picker__grid-list',
            listRef: model.listRef,
            rowComponent: iconRow,
            rowCount: model.rowCount,
            rowHeight: model.rowHeight,
            rowProps: {
                model,
                prefix: props.prefix,
                filteredOptions,
                columns,
                activeIdx,
                selectedValue: model.selectedOption?.value
            },
            overscanCount: 4,
            style: {
                height: gridHeight,
                width: rowWidth + getScrollbarSize(),
                '--xh-icon-picker-cell-size': `${cellSize}px`
            } as CSSProperties
        })
    });
});

interface IconRowProps {
    model: IconPickerModel;
    prefix: HoistIconPrefix;
    filteredOptions: IconOption[];
    columns: number;
    activeIdx: number;
    selectedValue: string;
}

/**
 * One windowed row of the grid. The highlight and selection arrive as row props, so react-window
 * re-renders rows when either changes.
 */
function iconRow({
    index,
    style,
    model,
    prefix,
    filteredOptions,
    columns,
    activeIdx,
    selectedValue
}: RowComponentProps<IconRowProps>) {
    const start = index * columns;
    return div({
        className: 'xh-icon-picker__row',
        style: {
            ...style,
            gridTemplateColumns: `repeat(${columns}, var(--xh-icon-picker-cell-size))`,
            columnGap: CELL_GAP
        },
        items: filteredOptions.slice(start, start + columns).map((option, i) =>
            iconCell({
                key: option.value,
                model,
                option,
                idx: start + i,
                prefix,
                isActive: start + i === activeIdx,
                isSelected: option.value === selectedValue
            })
        )
    });
}

const iconCell = hoistCmp.factory<IconPickerModel>(
    ({model, option, idx, prefix, isActive, isSelected}) =>
        buttonEl({
            type: 'button',
            tabIndex: -1,
            className: classNames(
                'xh-icon-picker__cell',
                isSelected && 'xh-icon-picker__cell--selected',
                isActive && 'xh-icon-picker__cell--active'
            ),
            title: option.displayName,
            'aria-label': option.displayName,
            onMouseEnter: () => model.setActiveIdx(idx),
            onClick: e => {
                e.stopPropagation();
                model.onIconClick(option);
            },
            item: option.factory({prefix})
        })
);

const menuFooter = hoistCmp.factory<IconPickerModel>(({model, props}) => {
    const {activeOption, enableClear} = model,
        hasSelection = !!model.selectedOption;

    return hbox({
        className: 'xh-icon-picker__footer',
        items: [
            span({
                className: 'xh-icon-picker__footer-name',
                item: activeOption?.displayName ?? ''
            }),
            filler(),
            div({
                omit: !enableClear,
                className: classNames(
                    'xh-icon-picker__footer-action',
                    !hasSelection && 'xh-icon-picker__footer-action--disabled'
                ),
                item: 'Clear',
                [TEST_ID]: getTestId(props, 'clear-btn'),
                onClick: e => {
                    e.stopPropagation();
                    if (hasSelection) model.clear();
                }
            })
        ]
    });
});
