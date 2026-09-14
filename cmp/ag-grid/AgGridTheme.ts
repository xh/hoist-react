/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Theme, ThemeDefaultParams} from '@xh/hoist/kit/ag-grid';
import {themeBalham} from 'ag-grid-community';
import {isEmpty, sortBy, toPairs} from 'lodash';

/**
 * Param overrides for Hoist's AG Grid theme - see `GridModel.theme` and {@link createAgGridTheme}.
 *
 * Any of AG Grid's documented theme params, e.g. `{headerBackgroundColor: 'navy', spacing: 4}`.
 */
export type AgGridThemeParams = Partial<ThemeDefaultParams>;

/**
 * Hoist's AG Grid theme, built with AG Grid's JS Theming API.
 *
 * Params are bound to Hoist's `--xh-grid-*` CSS variables (see styles/vars.scss), so dark mode and
 * app-level overrides work by flipping those vars - a single theme instance serves both modes.
 *
 * Prefer adding a param here over a rule in AgGrid.scss: params are typed, and unlike CSS scoped to
 * the grid wrapper they also reach ag-Grid's popups (menus, tooltips, popup editors).
 *
 * Note apps must not also enable legacy theming - see the v88 upgrade notes.
 */
export const xhAgGridTheme = themeBalham.withParams({
    // Follow the `color-scheme` ThemeModel sets on <html>, so one theme serves light and dark.
    browserColorScheme: 'inherit',

    // Base surface + text
    backgroundColor: 'var(--xh-grid-bg)',
    foregroundColor: 'var(--xh-grid-text-color)',
    fontFamily: 'var(--xh-grid-font-family)',
    fontSize: 'var(--xh-grid-font-size-px)',

    // Hoist grids usually sit inside bordered components such as panels.
    wrapperBorder: false,

    // Header
    headerBackgroundColor: 'var(--xh-grid-header-bg)',
    headerTextColor: 'var(--xh-grid-header-text-color)',
    headerFontFamily: 'var(--xh-grid-header-font-family)',
    headerFontSize: 'var(--xh-grid-header-font-size-px)',
    headerFontWeight: 'var(--xh-grid-header-font-weight)',
    headerRowBorder: '1px solid var(--xh-grid-header-border-color)',

    // Hover and striping are opt-in per grid - the `--show-hover` / `--stripe-rows` modifiers in
    // AgGrid.scss supply the color.
    selectedRowBackgroundColor: 'var(--xh-grid-selected-row-bg)',
    rowHoverColor: 'transparent',
    oddRowBackgroundColor: 'transparent',

    // Also covers header cells - AgGrid.scss overrides those to keep Hoist's separate header token.
    cellHorizontalPadding: 'var(--xh-grid-cell-lr-pad-px)',
    valueChangeValueHighlightBackgroundColor: 'var(--xh-grid-cell-change-bg-highlight)',

    // Borders off by default - the `--row-borders` / `--cell-borders` modifiers turn them on.
    borderColor: 'var(--xh-grid-border-color)',
    rowBorder: false,
    columnBorder: false,
    pinnedRowBorder: '1px solid var(--xh-grid-summary-row-border-color)',
    pinnedColumnBorder: '1px solid var(--xh-grid-pinned-column-border-color)',

    // Drives the focused-cell border too - there is no dedicated cell-focus param.
    rangeSelectionBorderColor: 'var(--xh-grid-cell-focus-border-color)',

    // The side bar is typically collapsed - avoid an unexpected border on the grid's right edge.
    sidePanelBorder: false,

    modalOverlayBackgroundColor: 'var(--xh-mask-bg)',

    // Menus and popups. Box-shadow matches the Blueprint context-menu popover.
    menuBackgroundColor: 'var(--xh-menu-bg)',
    menuTextColor: 'var(--xh-menu-item-text-color)',
    menuBorder: 'var(--xh-menu-border)',
    menuShadow:
        '0 0 0 1px rgba(16, 22, 26, 0.2), 0 2px 4px rgba(16, 22, 26, 0.4), 0 8px 24px rgba(16, 22, 26, 0.4)'
});

const themeCache = new Map<string, Theme<ThemeDefaultParams>>();

/**
 * Derive a variant of {@link xhAgGridTheme} with the given param overrides - backs `GridModel.theme`.
 *
 * Results are cached by param value: AG Grid injects a full copy of its params CSS per distinct theme
 * object, so identically-configured grids should share one. The cache is never evicted - safe because
 * `AgGridModel.theme` is set once at construction, bounding it by the app's distinct grid configs.
 */
export function createAgGridTheme(params: AgGridThemeParams): Theme<ThemeDefaultParams> {
    if (isEmpty(params)) return xhAgGridTheme;

    // Sorted so the key is insensitive to declaration order. Nested values (e.g. `{ref: 'accentColor'}`)
    // are not sorted - at worst a redundant cache entry, never an incorrect one.
    const key = JSON.stringify(sortBy(toPairs(params), 0));

    let theme = themeCache.get(key);
    if (!theme) {
        theme = xhAgGridTheme.withParams(params);
        themeCache.set(key, theme);
    }
    return theme;
}
