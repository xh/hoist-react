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
import {HoistIconPrefix, Icon, IconCatalogEntry} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, union} from 'lodash';
import {KeyboardEvent} from 'react';
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

    /** True to include icons registered with `hidden: true`. Defaults to false. */
    includeHidden?: boolean;

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
}

/**
 * An input for selecting an icon, rendered as a compact trigger button that opens a searchable
 * grid of the icons known to Hoist.
 *
 * The offered icons are sourced from {@link Icon.getCatalog} - Hoist's own built-in set, plus any
 * custom icons the app has registered via {@link Icon.register}. Apps therefore get their own
 * icons in this picker for free, with no additional wiring.
 *
 * The control's value is the selected icon's FontAwesome name (e.g. `'gear'`) - a stable,
 * persistable identifier that can be rendered back via `Icon.get(value)`.
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

class IconPickerModel extends HoistInputModel {
    override xhImpl = true;

    @observable popoverIsOpen: boolean = false;
    @bindable filterValue: string = '';

    /** Index within `filteredEntries` of the keyboard-highlighted icon. */
    @observable activeIdx: number = 0;

    gridRef = createObservableRef<HTMLElement>();

    /** Icons offered by this control, before any text filter is applied. */
    get entries(): IconCatalogEntry[] {
        const {icons, includeHidden} = this.componentProps;
        return isEmpty(icons)
            ? Icon.getCatalog().filter(it => includeHidden || !it.hidden)
            : compact(icons.map(it => Icon.getCatalogEntry(it)));
    }

    /**
     * Icons matching the current filter. Note this is deliberately *not* a computed - the icon
     * catalog is not observable, so caching it here could go stale if an app registers icons
     * after this control has first rendered.
     */
    get filteredEntries(): IconCatalogEntry[] {
        const {entries} = this,
            terms = this.filterValue.trim().toLowerCase().split(/\s+/).filter(Boolean);

        if (isEmpty(terms)) return entries;
        return entries.filter(it => {
            const searchText = searchTextFor(it);
            return terms.every(term => searchText.includes(term));
        });
    }

    get selectedEntry(): IconCatalogEntry {
        const {renderValue} = this;
        return renderValue ? Icon.getCatalogEntry(renderValue) : null;
    }

    /** Entry described in the popover footer - the keyboard-highlighted icon, else the selection. */
    get activeEntry(): IconCatalogEntry {
        return this.filteredEntries[this.activeIdx] ?? this.selectedEntry;
    }

    get enableClear(): boolean {
        return withDefault(this.componentProps.enableClear, true);
    }

    get columns(): number {
        return withDefault(this.componentProps.columns, 8);
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction(
            {
                // Restart the highlight at the first match whenever the filter changes.
                track: () => this.filterValue,
                run: () => this.setActiveIdx(0)
            },
            {
                // Keep the highlighted icon in view as it moves through the grid.
                track: () => [this.activeIdx, this.popoverIsOpen],
                run: () =>
                    this.gridRef.current?.children[this.activeIdx]?.scrollIntoView({
                        block: 'nearest'
                    })
            }
        );
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
        this.popoverIsOpen = true;
        this.filterValue = '';
        this.activeIdx = Math.max(this.filteredEntries.indexOf(this.selectedEntry), 0);
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

    isSelected(entry: IconCatalogEntry): boolean {
        return entry === this.selectedEntry;
    }

    onIconClick(entry: IconCatalogEntry) {
        this.noteValueChange(entry.iconName);
        this.closePopover();
    }

    clear() {
        this.noteValueChange(null);
        this.closePopover();
    }

    /**
     * Arrow keys move the highlight through the grid, enter selects it, and escape closes the
     * popover - all handled from the filter input, so users can type and navigate without
     * moving focus.
     */
    @action
    onKeyDown = (e: KeyboardEvent) => {
        const {filteredEntries, columns, activeIdx} = this,
            {length} = filteredEntries;

        switch (e.key) {
            case 'Escape':
                this.closePopover();
                return;
            case 'Enter':
                e.preventDefault();
                if (filteredEntries[activeIdx]) this.onIconClick(filteredEntries[activeIdx]);
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

function searchTextFor(entry: IconCatalogEntry): string {
    return union([entry.displayName], entry.names, entry.keywords).join(' ').toLowerCase();
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
    const {selectedEntry} = model,
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
            !selectedEntry && 'xh-icon-picker__trigger--empty',
            btnProps.className
        ),
        icon: selectedEntry ? selectedEntry.factory({prefix}) : Icon.placeholder(),
        text: showName
            ? (selectedEntry?.displayName ?? withDefault(props.placeholder, 'Select icon...'))
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
        onKeyDown: model.onKeyDown,
        // Keyboard nav is driven from whatever holds focus within the popover - the filter input
        // when present, otherwise this container itself.
        tabIndex: enableFilter ? null : 0,
        autoFocus: !enableFilter,
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

const iconGrid = hoistCmp.factory<IconPickerModel>(({model, props}) => {
    const {filteredEntries, columns} = model,
        maxMenuHeight = withDefault(props.maxMenuHeight, 260),
        {prefix} = props;

    if (isEmpty(filteredEntries)) {
        return div({className: 'xh-icon-picker__no-results', item: 'No matching icons found.'});
    }

    return div({
        className: 'xh-icon-picker__grid',
        ref: model.gridRef,
        style: {
            maxHeight: maxMenuHeight,
            gridTemplateColumns: `repeat(${columns}, var(--xh-icon-picker-cell-size))`
        },
        items: filteredEntries.map((entry, idx) =>
            buttonEl({
                key: entry.iconName,
                type: 'button',
                tabIndex: -1,
                className: classNames(
                    'xh-icon-picker__cell',
                    model.isSelected(entry) && 'xh-icon-picker__cell--selected',
                    idx === model.activeIdx && 'xh-icon-picker__cell--active'
                ),
                title: entry.displayName,
                'aria-label': entry.displayName,
                onMouseEnter: () => model.setActiveIdx(idx),
                onClick: e => {
                    e.stopPropagation();
                    model.onIconClick(entry);
                },
                item: entry.factory({prefix})
            })
        )
    });
});

const menuFooter = hoistCmp.factory<IconPickerModel>(({model, props}) => {
    const {activeEntry, enableClear} = model,
        hasSelection = !!model.selectedEntry;

    return hbox({
        className: 'xh-icon-picker__footer',
        items: [
            span({
                className: 'xh-icon-picker__footer-name',
                item: activeEntry?.displayName ?? ''
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
