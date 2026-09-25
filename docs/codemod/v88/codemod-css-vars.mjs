#!/usr/bin/env node
/*
 * One-shot codemod for the hoist-react v88 CSS variable overhaul.
 *
 * v88 resets Hoist's CSS custom properties onto a simpler baseline. This codemod migrates app
 * stylesheets and TypeScript from any v87-era usage to the v88 names and conventions:
 *
 *   1. Unprefixed override hooks → `--xh-*` variables.
 *      `body.xh-app { --grid-bg: #fafafa; }`  →  `body.xh-app { --xh-grid-bg: #fafafa; }`
 *      Only declarations inside a root-level selector (`body`, `html`, `:root`, `.xh-app`,
 *      `.xh-dark`, `.xh-mobile`) are migrated - the old hooks only ever worked there, and an
 *      unprefixed name used anywhere else is far more likely an app's own local variable. Reads
 *      (`var(--grid-bg)`) are migrated for any hook migrated as a declaration in the same run.
 *
 *   2. Renamed `--xh-*` variables → their new names (see RENAMES below), e.g.
 *      `--xh-pad-px` → `--xh-spacing`, `--xh-tbar-bg` → `--xh-toolbar-bg`.
 *      Every `-px` companion variable is gone: sizes now carry their unit, so the base variable is
 *      the one to read. `var(--xh-grid-font-size-px)` → `var(--xh-grid-font-size)`.
 *
 *   3. Unitless size overrides → `px` values. Size variables (see LENGTHS) now hold real lengths.
 *      `--xh-spacing: 8;` → `--xh-spacing: 8px;`
 *
 *   4. Arithmetic that re-applied the unit → plain arithmetic.
 *      `calc(var(--xh-spacing) * 1px)` → `var(--xh-spacing)`
 *      `calc(var(--xh-toolbar-item-spacing) * 2px)` → `calc(var(--xh-toolbar-item-spacing) * 2)`
 *
 * Removed variables (see REMOVED) are reported, not rewritten - none of them had any effect.
 * The script also warns about patterns it cannot safely rewrite: `calc()` expressions that add a
 * bare number to a size variable or divide by one, size variables assigned numbers from code, and
 * code referencing a size variable by name (which may read a value that now includes its unit).
 *
 * Usage, from an app's `client-app` directory:
 *   node node_modules/@xh/hoist/docs/codemod/v88/codemod-css-vars.mjs [--dry] [--no-hooks] [path ...]
 *
 * Paths default to `./client-app/src` if present, else the current directory - pass `src` when
 * running from `client-app`. Files are walked recursively, scanning .scss/.sass/.css/.less/.ts/
 * .tsx/.js/.jsx/.mjs/.md. Skips node_modules, build/, dist/, and .git/. `--dry` reports without
 * writing. `--no-hooks` skips step 1.
 *
 * Review the diff afterwards - in particular every hook migration listed in the output, and any
 * warnings. Then load the app in both light and dark themes (and mobile, if applicable).
 */
import {promises as fs, existsSync} from 'node:fs';
import path from 'node:path';

const EXCLUDED_DIRS = new Set(['node_modules', 'build', 'dist', '.git', '.idea', '.husky']);
const STYLE_EXTS = new Set(['.scss', '.sass', '.css', '.less']);
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const DOC_EXTS = new Set(['.md']);

// Renamed `--xh-*` variables, old → new. Includes every retired `-px` companion.
const RENAMES = {
    '--xh-appbar-color': '--xh-appbar-text-color',
    '--xh-appbar-height-px': '--xh-appbar-height',
    '--xh-appbar-title-color': '--xh-appbar-title-text-color',
    '--xh-appbar-title-font-size-px': '--xh-appbar-title-font-size',
    '--xh-border-radius-px': '--xh-border-radius',
    '--xh-border-width-px': '--xh-border-width',
    '--xh-button-border-radius-px': '--xh-button-border-radius',
    '--xh-button-font-size-px': '--xh-button-font-size',
    '--xh-card-border-radius-px': '--xh-card-border-radius',
    '--xh-card-header-font-size-px': '--xh-card-header-font-size',
    '--xh-card-header-gap-px': '--xh-card-header-gap',
    '--xh-card-header-min-height-px': '--xh-card-header-min-height',
    '--xh-focus-outline-offset-px': '--xh-focus-outline-offset',
    '--xh-focus-outline-width-px': '--xh-focus-outline-width',
    '--xh-date-range-picker-accent': '--xh-date-range-picker-accent-color',
    '--xh-font-size-large-em': '--xh-font-size-large-relative',
    '--xh-font-size-large-px': '--xh-font-size-large',
    '--xh-font-size-px': '--xh-font-size',
    '--xh-font-size-small-em': '--xh-font-size-small-relative',
    '--xh-font-size-small-px': '--xh-font-size-small',
    '--xh-form-field-info-border-width-px': '--xh-form-field-info-border-width',
    '--xh-form-field-info-color': '--xh-form-field-info-text-color',
    '--xh-form-field-invalid-border-width-px': '--xh-form-field-invalid-border-width',
    '--xh-form-field-invalid-color': '--xh-form-field-invalid-text-color',
    '--xh-form-field-label-color': '--xh-form-field-label-text-color',
    '--xh-form-field-msg-font-size': '--xh-form-field-message-font-size',
    '--xh-form-field-msg-line-height': '--xh-form-field-message-line-height',
    '--xh-form-field-msg-margin': '--xh-form-field-message-margin',
    '--xh-form-field-msg-text-transform': '--xh-form-field-message-text-transform',
    '--xh-form-field-warning-border-width-px': '--xh-form-field-warning-border-width',
    '--xh-form-field-warning-color': '--xh-form-field-warning-text-color',
    '--xh-grid-bg-hover': '--xh-grid-row-hover-bg',
    '--xh-grid-bg-odd': '--xh-grid-odd-row-bg',
    '--xh-grid-cell-change-bg-highlight': '--xh-grid-cell-changed-bg',
    '--xh-grid-cell-focus-border-color': '--xh-grid-cell-focused-border-color',
    '--xh-grid-cell-lr-pad': '--xh-grid-cell-padding-inline',
    '--xh-grid-cell-lr-pad-px': '--xh-grid-cell-padding-inline',
    '--xh-grid-compact-cell-lr-pad': '--xh-grid-compact-cell-padding-inline',
    '--xh-grid-compact-cell-lr-pad-px': '--xh-grid-compact-cell-padding-inline',
    '--xh-grid-compact-font-size-px': '--xh-grid-compact-font-size',
    '--xh-grid-compact-header-font-size-px': '--xh-grid-compact-header-font-size',
    '--xh-grid-compact-header-lr-pad': '--xh-grid-compact-header-padding-inline',
    '--xh-grid-compact-header-lr-pad-px': '--xh-grid-compact-header-padding-inline',
    '--xh-grid-filter-popover-height-px': '--xh-grid-filter-popover-height',
    '--xh-grid-filter-popover-width-px': '--xh-grid-filter-popover-width',
    '--xh-grid-font-size-px': '--xh-grid-font-size',
    '--xh-grid-header-font-size-px': '--xh-grid-header-font-size',
    '--xh-grid-header-lr-pad': '--xh-grid-header-padding-inline',
    '--xh-grid-header-lr-pad-px': '--xh-grid-header-padding-inline',
    '--xh-grid-large-cell-lr-pad': '--xh-grid-large-cell-padding-inline',
    '--xh-grid-large-cell-lr-pad-px': '--xh-grid-large-cell-padding-inline',
    '--xh-grid-large-font-size-px': '--xh-grid-large-font-size',
    '--xh-grid-large-header-font-size-px': '--xh-grid-large-header-font-size',
    '--xh-grid-large-header-lr-pad': '--xh-grid-large-header-padding-inline',
    '--xh-grid-large-header-lr-pad-px': '--xh-grid-large-header-padding-inline',
    '--xh-grid-selected-row-bg': '--xh-grid-row-selected-bg',
    '--xh-grid-selected-row-text-color': '--xh-grid-row-selected-text-color',
    '--xh-grid-tiny-cell-lr-pad': '--xh-grid-tiny-cell-padding-inline',
    '--xh-grid-tiny-cell-lr-pad-px': '--xh-grid-tiny-cell-padding-inline',
    '--xh-grid-tiny-font-size-px': '--xh-grid-tiny-font-size',
    '--xh-grid-tiny-header-font-size-px': '--xh-grid-tiny-header-font-size',
    '--xh-grid-tiny-header-lr-pad': '--xh-grid-tiny-header-padding-inline',
    '--xh-grid-tiny-header-lr-pad-px': '--xh-grid-tiny-header-padding-inline',
    '--xh-grid-tree-group-color-level-0': '--xh-grid-tree-group-level-0-bg',
    '--xh-grid-tree-group-color-level-1': '--xh-grid-tree-group-level-1-bg',
    '--xh-grid-tree-group-color-level-2': '--xh-grid-tree-group-level-2-bg',
    '--xh-grid-tree-group-color-level-3': '--xh-grid-tree-group-level-3-bg',
    '--xh-grid-tree-group-color-level-4': '--xh-grid-tree-group-level-4-bg',
    '--xh-grid-tree-group-color-level-5': '--xh-grid-tree-group-level-5-bg',
    '--xh-grid-tree-group-color-level-6': '--xh-grid-tree-group-level-6-bg',
    '--xh-grid-tree-group-color-level-7': '--xh-grid-tree-group-level-7-bg',
    '--xh-grid-tree-group-color-level-8': '--xh-grid-tree-group-level-8-bg',
    '--xh-grid-tree-group-color-level-9': '--xh-grid-tree-group-level-9-bg',
    '--xh-grid-tree-icon-px': '--xh-grid-tree-icon-size',
    '--xh-intent-input-border-radius-px': '--xh-intent-input-border-radius',
    '--xh-intent-input-compact-swatch-size-px': '--xh-intent-input-compact-swatch-size',
    '--xh-intent-input-gap-px': '--xh-intent-input-gap',
    '--xh-intent-input-swatch-size-px': '--xh-intent-input-swatch-size',
    '--xh-loading-indicator-color': '--xh-loading-indicator-text-color',
    '--xh-menu-heading-font-size-px': '--xh-menu-heading-font-size',
    '--xh-menu-item-font-size-px': '--xh-menu-item-font-size',
    '--xh-menu-item-height-px': '--xh-menu-item-height',
    '--xh-mobile-input-font-size': '--xh-input-font-size',
    '--xh-mobile-input-font-size-px': '--xh-input-font-size',
    '--xh-mobile-input-height-px': '--xh-input-height',
    '--xh-mobile-input-label-font-size': '--xh-input-label-font-size',
    '--xh-mobile-input-label-font-size-px': '--xh-input-label-font-size',
    '--xh-pad': '--xh-spacing',
    '--xh-pad-double': '--xh-spacing-double',
    '--xh-pad-double-px': '--xh-spacing-double',
    '--xh-pad-half': '--xh-spacing-half',
    '--xh-pad-half-px': '--xh-spacing-half',
    '--xh-pad-px': '--xh-spacing',
    '--xh-pad-safe-all': '--xh-safe-area-inset',
    '--xh-pad-safe-bottom': '--xh-safe-area-inset-bottom',
    '--xh-pad-safe-left': '--xh-safe-area-inset-left',
    '--xh-pad-safe-right': '--xh-safe-area-inset-right',
    '--xh-pad-safe-top': '--xh-safe-area-inset-top',
    '--xh-panel-border-width-px': '--xh-panel-border-width',
    '--xh-panel-title-font-size-px': '--xh-panel-title-font-size',
    '--xh-popup-border-width-px': '--xh-popup-border-width',
    '--xh-popup-title-font-size-px': '--xh-popup-title-font-size',
    '--xh-resizable-border-width-px': '--xh-resizable-border-width',
    '--xh-resizable-size-px': '--xh-resizable-size',
    '--xh-scrollbar-size-px': '--xh-scrollbar-size',
    '--xh-scrollbar-thumb': '--xh-scrollbar-thumb-color',
    '--xh-segmented-control-border-radius-px': '--xh-segmented-control-border-radius',
    '--xh-segmented-control-pad': '--xh-segmented-control-padding',
    '--xh-segmented-control-pad-px': '--xh-segmented-control-padding',
    '--xh-tab-font-size-px': '--xh-tab-font-size',
    '--xh-tbar-bg': '--xh-toolbar-bg',
    '--xh-tbar-border-color': '--xh-toolbar-border-color',
    '--xh-tbar-compact-font-size': '--xh-toolbar-compact-font-size',
    '--xh-tbar-compact-font-size-px': '--xh-toolbar-compact-font-size',
    '--xh-tbar-compact-item-height-px': '--xh-toolbar-compact-item-height',
    '--xh-tbar-compact-min-size': '--xh-toolbar-compact-min-size',
    '--xh-tbar-compact-min-size-px': '--xh-toolbar-compact-min-size',
    '--xh-tbar-font-size': '--xh-toolbar-font-size',
    '--xh-tbar-font-size-px': '--xh-toolbar-font-size',
    '--xh-tbar-item-pad': '--xh-toolbar-item-spacing',
    '--xh-tbar-item-pad-px': '--xh-toolbar-item-spacing',
    '--xh-tbar-min-size': '--xh-toolbar-min-size',
    '--xh-tbar-min-size-px': '--xh-toolbar-min-size',
    '--xh-tbar-separator-color': '--xh-toolbar-separator-color',
    '--xh-tbar-text-color': '--xh-toolbar-text-color',
    '--xh-title-compact-font-size-px': '--xh-title-compact-font-size',
    '--xh-title-compact-height-px': '--xh-title-compact-height',
    '--xh-title-font-size-px': '--xh-title-font-size',
    '--xh-title-height-px': '--xh-title-height',
    '--xh-title-icon-size-px': '--xh-title-icon-size',
    '--xh-title-pad': '--xh-title-padding',
    '--xh-title-pad-px': '--xh-title-padding',
    '--xh-zone-grid-bottom-font-size-px': '--xh-zone-grid-bottom-font-size',
    '--xh-zone-grid-cell-lr-pad-px': '--xh-zone-grid-cell-padding-inline',
    '--xh-zone-grid-delimiter-color': '--xh-zone-grid-delimiter-text-color',
    '--xh-zone-grid-label-color': '--xh-zone-grid-label-text-color',
    '--xh-zone-grid-top-font-size-px': '--xh-zone-grid-top-font-size'
};

// Variables removed outright, with the reason. Reported, never rewritten.
const REMOVED = {
    '--xh-chart-bg': 'Never applied - charts take their background from the Highcharts theme.',
    '--xh-tab-border-width': 'Never applied.',
    '--xh-tab-border-width-px': 'Never applied.',
    '--xh-toolbar-button-bg': 'Never applied.'
};

// Size variables that held a unitless number in v87 and now hold a length (v88 names).
const LENGTHS = new Set([
    '--xh-appbar-height', '--xh-appbar-title-font-size', '--xh-border-radius', '--xh-border-width',
    '--xh-button-font-size', '--xh-card-border-radius', '--xh-card-header-font-size',
    '--xh-card-header-gap', '--xh-card-header-min-height', '--xh-font-size', '--xh-font-size-large',
    '--xh-font-size-small', '--xh-form-field-info-border-width',
    '--xh-form-field-invalid-border-width', '--xh-form-field-warning-border-width',
    '--xh-grid-cell-padding-inline', '--xh-grid-compact-cell-padding-inline',
    '--xh-grid-compact-font-size', '--xh-grid-compact-header-font-size',
    '--xh-grid-compact-header-padding-inline', '--xh-grid-font-size', '--xh-grid-header-font-size',
    '--xh-grid-header-padding-inline', '--xh-grid-large-cell-padding-inline',
    '--xh-grid-large-font-size', '--xh-grid-large-header-font-size',
    '--xh-grid-large-header-padding-inline', '--xh-grid-tiny-cell-padding-inline',
    '--xh-grid-tiny-font-size', '--xh-grid-tiny-header-font-size',
    '--xh-grid-tiny-header-padding-inline', '--xh-input-font-size', '--xh-input-label-font-size',
    '--xh-panel-border-width', '--xh-panel-title-font-size', '--xh-popup-border-width',
    '--xh-popup-title-font-size', '--xh-resizable-border-width', '--xh-resizable-size',
    '--xh-segmented-control-border-radius', '--xh-segmented-control-padding', '--xh-spacing',
    '--xh-spacing-double', '--xh-spacing-half', '--xh-tab-font-size',
    '--xh-title-compact-font-size', '--xh-title-compact-height', '--xh-title-font-size',
    '--xh-title-height', '--xh-title-icon-size', '--xh-title-padding',
    '--xh-toolbar-compact-font-size', '--xh-toolbar-compact-min-size', '--xh-toolbar-font-size',
    '--xh-toolbar-item-spacing', '--xh-toolbar-min-size', '--xh-zone-grid-bottom-font-size',
    '--xh-zone-grid-top-font-size'
]);

// v87 unprefixed override hooks → the `--xh-*` variable they fed (v87 names - RENAMES applies after).
const HOOKS = {
    '--accent-color': '--xh-accent-color',
    '--appbar-bg': '--xh-appbar-bg',
    '--appbar-border-color': '--xh-appbar-border-color',
    '--appbar-box-shadow': '--xh-appbar-box-shadow',
    '--appbar-color': '--xh-appbar-color',
    '--appbar-height': '--xh-appbar-height',
    '--appbar-title-color': '--xh-appbar-title-color',
    '--appbar-title-font-size': '--xh-appbar-title-font-size',
    '--appbar-user-profile-hover-color': '--xh-appbar-user-profile-hover-color',
    '--backdrop-bg': '--xh-backdrop-bg',
    '--badge-bg': '--xh-badge-bg',
    '--badge-border-radius': '--xh-badge-border-radius',
    '--badge-font-size': '--xh-badge-font-size',
    '--badge-font-weight': '--xh-badge-font-weight',
    '--badge-gap': '--xh-badge-gap',
    '--badge-height': '--xh-badge-height',
    '--badge-min-width': '--xh-badge-min-width',
    '--badge-padding': '--xh-badge-padding',
    '--badge-text-color': '--xh-badge-text-color',
    '--bg': '--xh-bg',
    '--bg-alt': '--xh-bg-alt',
    '--bg-highlight': '--xh-bg-highlight',
    '--bg-highlight-alt': '--xh-bg-highlight-alt',
    '--black': '--xh-black',
    '--blue': '--xh-blue',
    '--blue-dark': '--xh-blue-dark',
    '--blue-gray': '--xh-blue-gray',
    '--blue-gray-dark': '--xh-blue-gray-dark',
    '--blue-gray-light': '--xh-blue-gray-light',
    '--blue-light': '--xh-blue-light',
    '--blue-muted': '--xh-blue-muted',
    '--border-color': '--xh-border-color',
    '--border-radius': '--xh-border-radius',
    '--border-width': '--xh-border-width',
    '--button-active-bg': '--xh-button-active-bg',
    '--button-active-box-shadow': '--xh-button-active-box-shadow',
    '--button-active-text-color': '--xh-button-active-text-color',
    '--button-bg': '--xh-button-bg',
    '--button-bg-darker': '--xh-button-bg-darker',
    '--button-bg-darkest': '--xh-button-bg-darkest',
    '--button-bg-lighter': '--xh-button-bg-lighter',
    '--button-bg-lightest': '--xh-button-bg-lightest',
    '--button-border-color': '--xh-button-border-color',
    '--button-border-radius-px': '--xh-button-border-radius-px',
    '--button-disabled-opacity': '--xh-button-disabled-opacity',
    '--button-font-family': '--xh-button-font-family',
    '--button-font-size': '--xh-button-font-size',
    '--button-height': '--xh-button-height',
    '--button-text-color': '--xh-button-text-color',
    '--card-bg': '--xh-card-bg',
    '--card-border-color': '--xh-card-border-color',
    '--card-border-radius': '--xh-card-border-radius',
    '--card-danger-color': '--xh-card-danger-color',
    '--card-header-font-size': '--xh-card-header-font-size',
    '--card-header-gap': '--xh-card-header-gap',
    '--card-header-min-height': '--xh-card-header-min-height',
    '--card-header-text-color': '--xh-card-header-text-color',
    '--card-primary-color': '--xh-card-primary-color',
    '--card-success-color': '--xh-card-success-color',
    '--card-warning-color': '--xh-card-warning-color',
    '--chart-bg': '--xh-chart-bg',
    '--chart-font-family': '--xh-chart-font-family',
    '--dash-canvas-grid-cell-color': '--xh-dash-canvas-grid-cell-color',
    '--date-range-picker-accent': '--xh-date-range-picker-accent',
    '--date-range-picker-accent-text-color': '--xh-date-range-picker-accent-text-color',
    '--date-range-picker-date-font-family': '--xh-date-range-picker-date-font-family',
    '--date-range-picker-date-font-size': '--xh-date-range-picker-date-font-size',
    '--date-range-picker-day-size': '--xh-date-range-picker-day-size',
    '--date-range-picker-footer-bg': '--xh-date-range-picker-footer-bg',
    '--date-range-picker-hover-bg': '--xh-date-range-picker-hover-bg',
    '--date-range-picker-popover-min-height': '--xh-date-range-picker-popover-min-height',
    '--date-range-picker-popover-single-width': '--xh-date-range-picker-popover-single-width',
    '--date-range-picker-popover-width': '--xh-date-range-picker-popover-width',
    '--date-range-picker-rail-bg': '--xh-date-range-picker-rail-bg',
    '--date-range-picker-row-height': '--xh-date-range-picker-row-height',
    '--date-range-picker-selected-bg': '--xh-date-range-picker-selected-bg',
    '--focus-outline': '--xh-focus-outline',
    '--focus-outline-color': '--xh-focus-outline-color',
    '--focus-outline-offset-px': '--xh-focus-outline-offset-px',
    '--focus-outline-width-px': '--xh-focus-outline-width-px',
    '--font-family': '--xh-font-family',
    '--font-family-headings': '--xh-font-family-headings',
    '--font-family-mono': '--xh-font-family-mono',
    '--font-feature-settings': '--xh-font-feature-settings',
    '--font-size': '--xh-font-size',
    '--font-size-large-em': '--xh-font-size-large-em',
    '--font-size-large-mult': '--xh-font-size-large-mult',
    '--font-size-small-em': '--xh-font-size-small-em',
    '--font-size-small-mult': '--xh-font-size-small-mult',
    '--form-field-box-shadow': '--xh-form-field-box-shadow',
    '--form-field-box-shadow-color-bottom': '--xh-form-field-box-shadow-color-bottom',
    '--form-field-box-shadow-color-top': '--xh-form-field-box-shadow-color-top',
    '--form-field-focused-border-color': '--xh-form-field-focused-border-color',
    '--form-field-focused-box-shadow': '--xh-form-field-focused-box-shadow',
    '--form-field-info-border-color': '--xh-form-field-info-border-color',
    '--form-field-info-border-width': '--xh-form-field-info-border-width',
    '--form-field-info-color': '--xh-form-field-info-color',
    '--form-field-inline-label-border-bottom': '--xh-form-field-inline-label-border-bottom',
    '--form-field-inline-label-margin': '--xh-form-field-inline-label-margin',
    '--form-field-inline-label-padding': '--xh-form-field-inline-label-padding',
    '--form-field-invalid-border-color': '--xh-form-field-invalid-border-color',
    '--form-field-invalid-border-width': '--xh-form-field-invalid-border-width',
    '--form-field-invalid-color': '--xh-form-field-invalid-color',
    '--form-field-label-border-bottom': '--xh-form-field-label-border-bottom',
    '--form-field-label-color': '--xh-form-field-label-color',
    '--form-field-label-font-size': '--xh-form-field-label-font-size',
    '--form-field-label-font-style': '--xh-form-field-label-font-style',
    '--form-field-label-font-weight': '--xh-form-field-label-font-weight',
    '--form-field-label-margin': '--xh-form-field-label-margin',
    '--form-field-label-padding': '--xh-form-field-label-padding',
    '--form-field-label-text-transform': '--xh-form-field-label-text-transform',
    '--form-field-margin': '--xh-form-field-margin',
    '--form-field-msg-font-size': '--xh-form-field-msg-font-size',
    '--form-field-msg-line-height': '--xh-form-field-msg-line-height',
    '--form-field-msg-margin': '--xh-form-field-msg-margin',
    '--form-field-msg-text-transform': '--xh-form-field-msg-text-transform',
    '--form-field-padding': '--xh-form-field-padding',
    '--form-field-readonly-label-border-bottom': '--xh-form-field-readonly-label-border-bottom',
    '--form-field-readonly-label-margin': '--xh-form-field-readonly-label-margin',
    '--form-field-readonly-label-padding': '--xh-form-field-readonly-label-padding',
    '--form-field-warning-border-color': '--xh-form-field-warning-border-color',
    '--form-field-warning-border-width': '--xh-form-field-warning-border-width',
    '--form-field-warning-color': '--xh-form-field-warning-color',
    '--gray': '--xh-gray',
    '--gray-dark': '--xh-gray-dark',
    '--gray-light': '--xh-gray-light',
    '--green': '--xh-green',
    '--green-muted': '--xh-green-muted',
    '--grid-bg': '--xh-grid-bg',
    '--grid-bg-hover': '--xh-grid-bg-hover',
    '--grid-bg-odd': '--xh-grid-bg-odd',
    '--grid-border-color': '--xh-grid-border-color',
    '--grid-cell-bg-highlight': '--xh-grid-cell-change-bg-highlight',
    '--grid-cell-focus-border-color': '--xh-grid-cell-focus-border-color',
    '--grid-cell-lr-pad': '--xh-grid-cell-lr-pad',
    '--grid-compact-cell-lr-pad': '--xh-grid-compact-cell-lr-pad',
    '--grid-compact-font-size': '--xh-grid-compact-font-size',
    '--grid-compact-header-font-size': '--xh-grid-compact-header-font-size',
    '--grid-compact-header-lr-pad': '--xh-grid-compact-header-lr-pad',
    '--grid-empty-text-color': '--xh-grid-empty-text-color',
    '--grid-filter-popover-height-px': '--xh-grid-filter-popover-height-px',
    '--grid-filter-popover-width-px': '--xh-grid-filter-popover-width-px',
    '--grid-font-family': '--xh-grid-font-family',
    '--grid-font-size': '--xh-grid-font-size',
    '--grid-group-bg': '--xh-grid-group-bg',
    '--grid-group-border-color': '--xh-grid-group-border-color',
    '--grid-group-text-color': '--xh-grid-group-text-color',
    '--grid-header-bg': '--xh-grid-header-bg',
    '--grid-header-border-color': '--xh-grid-header-border-color',
    '--grid-header-cell-lr-pad': '--xh-grid-header-lr-pad',
    '--grid-header-font-family': '--xh-grid-header-font-family',
    '--grid-header-font-size': '--xh-grid-header-font-size',
    '--grid-header-font-weight': '--xh-grid-header-font-weight',
    '--grid-header-icon-color': '--xh-grid-header-icon-color',
    '--grid-header-icon-width': '--xh-grid-header-icon-width',
    '--grid-header-text-color': '--xh-grid-header-text-color',
    '--grid-large-cell-lr-pad': '--xh-grid-large-cell-lr-pad',
    '--grid-large-font-size': '--xh-grid-large-font-size',
    '--grid-large-header-font-size': '--xh-grid-large-header-font-size',
    '--grid-large-header-lr-pad': '--xh-grid-large-header-lr-pad',
    '--grid-pinned-column-border-color': '--xh-grid-pinned-column-border-color',
    '--grid-selected-row-bg': '--xh-grid-selected-row-bg',
    '--grid-selected-row-text-color': '--xh-grid-selected-row-text-color',
    '--grid-summary-row-border-color': '--xh-grid-summary-row-border-color',
    '--grid-text-color': '--xh-grid-text-color',
    '--grid-tiny-cell-lr-pad': '--xh-grid-tiny-cell-lr-pad',
    '--grid-tiny-font-size': '--xh-grid-tiny-font-size',
    '--grid-tiny-header-font-size': '--xh-grid-tiny-header-font-size',
    '--grid-tiny-header-lr-pad': '--xh-grid-tiny-header-lr-pad',
    '--grid-tooltip-bg': '--xh-grid-tooltip-bg',
    '--grid-tooltip-border': '--xh-grid-tooltip-border',
    '--grid-tooltip-border-radius': '--xh-grid-tooltip-border-radius',
    '--grid-tooltip-max-width': '--xh-grid-tooltip-max-width',
    '--grid-tooltip-padding': '--xh-grid-tooltip-padding',
    '--grid-total-row-bg': '--xh-grid-total-row-bg',
    '--grid-tree-group-bg': '--xh-grid-tree-group-bg',
    '--grid-tree-group-border-color': '--xh-grid-tree-group-border-color',
    '--grid-tree-group-color-level-0': '--xh-grid-tree-group-color-level-0',
    '--grid-tree-group-color-level-1': '--xh-grid-tree-group-color-level-1',
    '--grid-tree-group-color-level-2': '--xh-grid-tree-group-color-level-2',
    '--grid-tree-group-color-level-3': '--xh-grid-tree-group-color-level-3',
    '--grid-tree-group-color-level-4': '--xh-grid-tree-group-color-level-4',
    '--grid-tree-group-color-level-5': '--xh-grid-tree-group-color-level-5',
    '--grid-tree-group-color-level-6': '--xh-grid-tree-group-color-level-6',
    '--grid-tree-group-color-level-7': '--xh-grid-tree-group-color-level-7',
    '--grid-tree-group-color-level-8': '--xh-grid-tree-group-color-level-8',
    '--grid-tree-group-color-level-9': '--xh-grid-tree-group-color-level-9',
    '--grid-tree-icon-px': '--xh-grid-tree-icon-px',
    '--grid-tree-indent': '--xh-grid-tree-indent',
    '--input-bg': '--xh-input-bg',
    '--input-disabled-bg': '--xh-input-disabled-bg',
    '--input-disabled-checkmark-svg': '--xh-input-disabled-checkmark-svg',
    '--input-disabled-text-color': '--xh-input-disabled-text-color',
    '--input-font-family': '--xh-input-font-family',
    '--input-font-feature-settings': '--xh-input-font-feature-settings',
    '--input-placeholder-color': '--xh-input-placeholder-text-color',
    '--input-text-color': '--xh-input-text-color',
    '--intent-a1': '--xh-intent-a1',
    '--intent-a2': '--xh-intent-a2',
    '--intent-danger-h': '--xh-intent-danger-h',
    '--intent-danger-l1': '--xh-intent-danger-l1',
    '--intent-danger-l2': '--xh-intent-danger-l2',
    '--intent-danger-l3': '--xh-intent-danger-l3',
    '--intent-danger-l4': '--xh-intent-danger-l4',
    '--intent-danger-l5': '--xh-intent-danger-l5',
    '--intent-danger-s': '--xh-intent-danger-s',
    '--intent-danger-text-color': '--xh-intent-danger-text-color',
    '--intent-input-border-radius-px': '--xh-intent-input-border-radius-px',
    '--intent-input-compact-swatch-size-px': '--xh-intent-input-compact-swatch-size-px',
    '--intent-input-gap-px': '--xh-intent-input-gap-px',
    '--intent-input-swatch-size-px': '--xh-intent-input-swatch-size-px',
    '--intent-neutral-h': '--xh-intent-neutral-h',
    '--intent-neutral-l1': '--xh-intent-neutral-l1',
    '--intent-neutral-l2': '--xh-intent-neutral-l2',
    '--intent-neutral-l3': '--xh-intent-neutral-l3',
    '--intent-neutral-l4': '--xh-intent-neutral-l4',
    '--intent-neutral-l5': '--xh-intent-neutral-l5',
    '--intent-neutral-s': '--xh-intent-neutral-s',
    '--intent-primary-h': '--xh-intent-primary-h',
    '--intent-primary-l1': '--xh-intent-primary-l1',
    '--intent-primary-l2': '--xh-intent-primary-l2',
    '--intent-primary-l3': '--xh-intent-primary-l3',
    '--intent-primary-l4': '--xh-intent-primary-l4',
    '--intent-primary-l5': '--xh-intent-primary-l5',
    '--intent-primary-s': '--xh-intent-primary-s',
    '--intent-primary-text-color': '--xh-intent-primary-text-color',
    '--intent-success-h': '--xh-intent-success-h',
    '--intent-success-l1': '--xh-intent-success-l1',
    '--intent-success-l2': '--xh-intent-success-l2',
    '--intent-success-l3': '--xh-intent-success-l3',
    '--intent-success-l4': '--xh-intent-success-l4',
    '--intent-success-l5': '--xh-intent-success-l5',
    '--intent-success-s': '--xh-intent-success-s',
    '--intent-success-text-color': '--xh-intent-success-text-color',
    '--intent-warning-h': '--xh-intent-warning-h',
    '--intent-warning-l1': '--xh-intent-warning-l1',
    '--intent-warning-l2': '--xh-intent-warning-l2',
    '--intent-warning-l3': '--xh-intent-warning-l3',
    '--intent-warning-l4': '--xh-intent-warning-l4',
    '--intent-warning-l5': '--xh-intent-warning-l5',
    '--intent-warning-s': '--xh-intent-warning-s',
    '--intent-warning-text-color': '--xh-intent-warning-text-color',
    '--list-select-color': '--xh-list-select-color',
    '--loading-indicator-bg': '--xh-loading-indicator-bg',
    '--loading-indicator-border-color': '--xh-loading-indicator-border-color',
    '--loading-indicator-color': '--xh-loading-indicator-color',
    '--loading-indicator-spinner-color': '--xh-loading-indicator-spinner-color',
    '--mask-bg': '--xh-mask-bg',
    '--mask-text-bg': '--xh-mask-text-bg',
    '--mask-text-border': '--xh-mask-text-border',
    '--mask-text-color': '--xh-mask-text-color',
    '--menu-bg': '--xh-menu-bg',
    '--menu-border': '--xh-menu-border',
    '--menu-heading-border': '--xh-menu-heading-border',
    '--menu-heading-font-size-px': '--xh-menu-heading-font-size-px',
    '--menu-heading-font-weight': '--xh-menu-heading-font-weight',
    '--menu-heading-text-color': '--xh-menu-heading-text-color',
    '--menu-item-font-size-px': '--xh-menu-item-font-size-px',
    '--menu-item-height-px': '--xh-menu-item-height-px',
    '--menu-item-highlight-bg': '--xh-menu-item-highlight-bg',
    '--menu-item-text-color': '--xh-menu-item-text-color',
    '--mobile-input-font-size': '--xh-mobile-input-font-size',
    '--mobile-input-height-px': '--xh-mobile-input-height-px',
    '--mobile-input-label-font-size': '--xh-mobile-input-label-font-size',
    '--neg-val-color': '--xh-neg-val-color',
    '--neutral-val-color': '--xh-neutral-val-color',
    '--orange': '--xh-orange',
    '--orange-muted': '--xh-orange-muted',
    '--pad': '--xh-pad',
    '--panel-bg': '--xh-panel-bg',
    '--panel-border-color': '--xh-panel-border-color',
    '--panel-border-width': '--xh-panel-border-width',
    '--panel-title-bg': '--xh-panel-title-bg',
    '--panel-title-font-family': '--xh-panel-title-font-family',
    '--panel-title-font-size': '--xh-panel-title-font-size',
    '--panel-title-text-color': '--xh-panel-title-text-color',
    '--popover-backdrop': '--xh-popover-backdrop-bg',
    '--popover-shadow': '--xh-popover-box-shadow',
    '--popup-bg': '--xh-popup-bg',
    '--popup-border-color': '--xh-popup-border-color',
    '--popup-border-width': '--xh-popup-border-width',
    '--popup-title-bg': '--xh-popup-title-bg',
    '--popup-title-font-family': '--xh-popup-title-font-family',
    '--popup-title-font-size': '--xh-popup-title-font-size',
    '--popup-title-text-color': '--xh-popup-title-text-color',
    '--pos-val-color': '--xh-pos-val-color',
    '--purple': '--xh-purple',
    '--red': '--xh-red',
    '--red-muted': '--xh-red-muted',
    '--resizable-bg': '--xh-resizable-bg',
    '--resizable-border-color': '--xh-resizable-border-color',
    '--resizable-border-width': '--xh-resizable-border-width',
    '--resizable-button-bg': '--xh-resizable-button-bg',
    '--resizable-button-icon-color': '--xh-resizable-button-icon-color',
    '--resizable-size': '--xh-resizable-size',
    '--scrollbar-bg': '--xh-scrollbar-bg',
    '--scrollbar-size-px': '--xh-scrollbar-size-px',
    '--scrollbar-thumb': '--xh-scrollbar-thumb',
    '--segmented-control-bg': '--xh-segmented-control-bg',
    '--segmented-control-border-radius': '--xh-segmented-control-border-radius',
    '--segmented-control-pad': '--xh-segmented-control-pad',
    '--segmented-control-selected-bg': '--xh-segmented-control-selected-bg',
    '--segmented-control-selected-text-color': '--xh-segmented-control-selected-text-color',
    '--segmented-control-text-color': '--xh-segmented-control-text-color',
    '--slider-handle-focused-box-shadow': '--xh-slider-handle-focused-box-shadow',
    '--spinner-color': '--xh-spinner-color',
    '--tab-active-text-color': '--xh-tab-active-text-color',
    '--tab-border-width': '--xh-tab-border-width',
    '--tab-disabled-text-color': '--xh-tab-disabled-text-color',
    '--tab-font-family': '--xh-tab-font-family',
    '--tab-font-size': '--xh-tab-font-size',
    '--tab-switcher-vertical-border': '--xh-tab-switcher-vertical-border',
    '--tab-switcher-vertical-item-active-bg': '--xh-tab-switcher-vertical-item-active-bg',
    '--tab-switcher-vertical-item-active-font-weight': '--xh-tab-switcher-vertical-item-active-font-weight',
    '--tab-switcher-vertical-item-active-text-color': '--xh-tab-switcher-vertical-item-active-text-color',
    '--tab-switcher-vertical-item-border-radius': '--xh-tab-switcher-vertical-item-border-radius',
    '--tab-switcher-vertical-item-font-weight': '--xh-tab-switcher-vertical-item-font-weight',
    '--tab-switcher-vertical-item-gap': '--xh-tab-switcher-vertical-item-gap',
    '--tab-switcher-vertical-item-hover-bg': '--xh-tab-switcher-vertical-item-hover-bg',
    '--tab-switcher-vertical-item-padding': '--xh-tab-switcher-vertical-item-padding',
    '--tab-switcher-vertical-item-text-color': '--xh-tab-switcher-vertical-item-text-color',
    '--tab-switcher-vertical-min-width': '--xh-tab-switcher-vertical-min-width',
    '--tab-switcher-vertical-padding': '--xh-tab-switcher-vertical-padding',
    '--tab-text-color': '--xh-tab-text-color',
    '--tbar-bg': '--xh-tbar-bg',
    '--tbar-border-color': '--xh-tbar-border-color',
    '--tbar-compact-font-size': '--xh-tbar-compact-font-size',
    '--tbar-compact-min-size': '--xh-tbar-compact-min-size',
    '--tbar-font-size': '--xh-tbar-font-size',
    '--tbar-item-pad': '--xh-tbar-item-pad',
    '--tbar-min-size': '--xh-tbar-min-size',
    '--tbar-separator-color': '--xh-tbar-separator-color',
    '--tbar-text-color': '--xh-tbar-text-color',
    '--text-color': '--xh-text-color',
    '--text-color-accent': '--xh-text-color-accent',
    '--text-color-headings': '--xh-text-color-headings',
    '--text-color-highlight': '--xh-text-color-highlight',
    '--text-color-muted': '--xh-text-color-muted',
    '--title-bg': '--xh-title-bg',
    '--title-compact-font-size': '--xh-title-compact-font-size',
    '--title-compact-height': '--xh-title-compact-height',
    '--title-font-family': '--xh-title-font-family',
    '--title-font-size': '--xh-title-font-size',
    '--title-height': '--xh-title-height',
    '--title-icon-size': '--xh-title-icon-size',
    '--title-pad': '--xh-title-pad',
    '--title-text-color': '--xh-title-text-color',
    '--toolbar-button-bg': '--xh-toolbar-button-bg',
    '--white': '--xh-white',
    '--yellow': '--xh-yellow',
    '--yellow-light': '--xh-yellow-light',
    '--zone-grid-bottom-font-size': '--xh-zone-grid-bottom-font-size',
    '--zone-grid-bottom-text-color': '--xh-zone-grid-bottom-text-color',
    '--zone-grid-cell-pad-px': '--xh-zone-grid-cell-lr-pad-px',
    '--zone-grid-delimiter-color': '--xh-zone-grid-delimiter-color',
    '--zone-grid-label-color': '--xh-zone-grid-label-color',
    '--zone-grid-top-font-size': '--xh-zone-grid-top-font-size',
    '--zone-grid-top-text-color': '--xh-zone-grid-top-text-color'
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const NO_HOOKS = args.includes('--no-hooks');
const SELF = path.resolve(new URL(import.meta.url).pathname);
const paths = args.filter(a => !a.startsWith('--'));
const defaultRoot = existsSync('client-app/src') ? 'client-app/src' : '.';
const roots = (paths.length ? paths : [defaultRoot]).map(p => path.resolve(p));

const NAME = '--[a-zA-Z0-9_-]*[a-zA-Z0-9_]';
const tokenRe = name => new RegExp(`${escapeRe(name)}(?![a-zA-Z0-9_-])`, 'g');
const report = {files: 0, changed: 0, hooks: [], renames: 0, units: 0, calcs: 0, dropped: 0, removed: [], warnings: []};

const files = [];
for (const root of roots) await collect(root);

// Pass 1 - find hook declarations in root-level selectors (across all files, so reads anywhere follow).
const migratedHooks = new Set();
if (!NO_HOOKS) {
    for (const f of files) {
        if (!STYLE_EXTS.has(path.extname(f))) continue;
        const src = await fs.readFile(f, 'utf8');
        for (const {name, rootLevel} of scanDeclarations(src)) {
            if (rootLevel && HOOKS[name]) migratedHooks.add(name);
        }
    }
}

// Pass 2 - rewrite.
for (const f of files) {
    report.files++;
    const ext = path.extname(f);
    const before = await fs.readFile(f, 'utf8');
    let src = before;
    const rel = path.relative(process.cwd(), f);

    if (STYLE_EXTS.has(ext) && migratedHooks.size) src = migrateHooks(src, rel);
    src = applyRenames(src);
    if (STYLE_EXTS.has(ext)) src = addUnits(src);
    if (!DOC_EXTS.has(ext)) src = cleanCalcs(src);
    if (STYLE_EXTS.has(ext)) src = dropSelfReferences(src);
    warn(src, rel, ext);

    if (src !== before) {
        report.changed++;
        if (!DRY) await fs.writeFile(f, src);
        console.log(`${DRY ? '[dry] ' : ''}updated ${rel}`);
    }
}

printReport();

//------------------------
// Transforms
//------------------------
function migrateHooks(src, rel) {
    // Declarations: only those in a root-level selector.
    const decls = scanDeclarations(src).filter(d => d.rootLevel && migratedHooks.has(d.name));
    for (const d of decls.reverse()) {
        const target = HOOKS[d.name];
        src = src.slice(0, d.index) + target + src.slice(d.index + d.name.length);
        report.hooks.push(`${rel}:${lineOf(src, d.index)}  ${d.name} → ${RENAMES[target] ?? target}`);
    }
    // Reads.
    return src.replace(new RegExp(`var\\(\\s*(${NAME})`, 'g'), (m, name) => {
        if (!migratedHooks.has(name)) return m;
        report.hooks.push(`${rel}  var(${name}) → var(${RENAMES[HOOKS[name]] ?? HOOKS[name]})`);
        return m.replace(name, HOOKS[name]);
    });
}

function applyRenames(src) {
    return src.replace(/--xh-[a-z0-9-]*[a-z0-9]/g, name => {
        if (RENAMES[name]) {
            report.renames++;
            return RENAMES[name];
        }
        return name;
    });
}

function addUnits(src) {
    // `--xh-spacing: 8;` / `--xh-spacing: 8 !important;` → `8px`
    return src.replace(/(--xh-[a-z0-9-]*[a-z0-9])(\s*:\s*)(-?\d*\.?\d+)(\s*(?:!important\s*)?[;}])/g, (m, name, sep, num, tail) => {
        if (!LENGTHS.has(name)) return m;
        report.units++;
        return `${name}${sep}${num}px${tail}`;
    });
}

function cleanCalcs(src) {
    const len = '(var\\(\\s*(--xh-[a-z0-9-]*[a-z0-9])\\s*\\))';
    // calc(var(--len) * 1px) → var(--len)
    src = src.replace(new RegExp(`calc\\(\\s*${len}\\s*\\*\\s*1px\\s*\\)`, 'g'), (m, v, name) => {
        if (!LENGTHS.has(name)) return m;
        report.calcs++;
        return v;
    });
    src = src.replace(new RegExp(`calc\\(\\s*1px\\s*\\*\\s*${len}\\s*\\)`, 'g'), (m, v, name) => {
        if (!LENGTHS.has(name)) return m;
        report.calcs++;
        return v;
    });
    // var(--len) * Npx → var(--len) * N ; Npx * var(--len) → N * var(--len)
    src = src.replace(new RegExp(`${len}(\\s*\\*\\s*)(-?\\d*\\.?\\d+)px\\b`, 'g'), (m, v, name, op, num) => {
        if (!LENGTHS.has(name)) return m;
        report.calcs++;
        return `${v}${op}${num}`;
    });
    src = src.replace(new RegExp(`(-?\\d*\\.?\\d+)px(\\s*\\*\\s*)${len}`, 'g'), (m, num, op, v, name) => {
        if (!LENGTHS.has(name)) return m;
        report.calcs++;
        return `${num}${op}${v}`;
    });
    return src;
}

function dropSelfReferences(src) {
    // A retired `-px` companion renamed onto its base collapses to `--x: var(--x);` - remove it.
    src = src.replace(/^[ \t]*(--xh-[a-z0-9-]*[a-z0-9])\s*:\s*var\(\s*\1\s*\)\s*;[ \t]*\r?\n/gm, () => {
        report.dropped++;
        return '';
    });
    // A base + companion pair set to the same size (`--x: 4; --x-px: 4px;`) collapses to two
    // identical declarations - keep one.
    const lines = src.split('\n');
    return lines
        .filter((line, i) => {
            const t = line.trim();
            if (i > 0 && /^--xh-[a-z0-9-]+\s*:/.test(t) && t === lines[i - 1].trim()) {
                report.dropped++;
                return false;
            }
            return true;
        })
        .join('\n');
}

function warn(src, rel, ext) {
    for (const name of Object.keys(REMOVED)) {
        if (tokenRe(name).test(src)) report.removed.push(`${rel}  ${name} - ${REMOVED[name]}`);
    }
    const lines = src.split('\n');
    lines.forEach((line, i) => {
        const lens = [...line.matchAll(/var\(\s*(--xh-[a-z0-9-]*[a-z0-9])\s*\)/g)].map(m => m[1]).filter(n => LENGTHS.has(n));
        if (lens.length && /calc\(/.test(line)) {
            if (/\/\s*var\(\s*--xh-/.test(line)) {
                report.warnings.push(`${rel}:${i + 1}  divides by a size variable, which now carries a unit: ${line.trim()}`);
            }
            if (/(^|[^*/\s])\s*[+-]\s*\d*\.?\d+(?![\w%.]|\s*\*)/.test(line.replace(/--[a-zA-Z0-9_-]+/g, 'X').replace(/\d*\.?\d+(px|em|rem|%|vh|vw)/g, ''))) {
                report.warnings.push(`${rel}:${i + 1}  adds/subtracts a bare number with a size variable - add a unit: ${line.trim()}`);
            }
        }
        if (CODE_EXTS.has(ext)) {
            for (const r of line.matchAll(/(?<!var\(\s*)['"`](--xh-[a-z0-9-]*[a-z0-9])['"`]/g)) {
                if (LENGTHS.has(r[1])) {
                    report.warnings.push(`${rel}:${i + 1}  references size variable ${r[1]} by name - if this reads its value (e.g. via getPropertyValue), the value now includes its unit: ${line.trim()}`);
                }
            }
            const m = line.match(/['"](--xh-[a-z0-9-]*[a-z0-9])['"]\s*[:,]\s*(-?\d*\.?\d+)\b/);
            if (m && LENGTHS.has(m[1])) {
                report.warnings.push(`${rel}:${i + 1}  sets size variable ${m[1]} to a bare number - use a length string, e.g. '${m[2]}px'`);
            }
        }
    });
}

//------------------------
// Helpers
//------------------------
// Minimal CSS/SCSS scanner - yields each custom-property declaration with whether its enclosing
// selector chain is root-level. Handles nesting and `&` suffixes; ignores comments and strings.
function scanDeclarations(src) {
    const out = [];
    const clean = src
        .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[\s;{}])(\/\/[^\n]*)/gm, (m, pre, c) => pre + ' '.repeat(c.length));
    const stack = [];
    let buf = '';
    for (let i = 0; i < clean.length; i++) {
        const c = clean[i];
        if (c === '{') {
            stack.push(buf.trim());
            buf = '';
        } else if (c === '}') {
            stack.pop();
            buf = '';
        } else if (c === ';') {
            buf = '';
        } else {
            buf += c;
            if (/^\s*--[a-zA-Z0-9_-]+\s*:$/.test(buf)) {
                const name = buf.trim().replace(/\s*:$/, '');
                const index = clean.lastIndexOf(name, i);
                out.push({name, index, rootLevel: isRootChain(stack)});
            }
        }
    }
    return out;
}

function isRootChain(stack) {
    if (!stack.length) return false;
    return stack.every(sel => sel.split(',').some(s => /^(&?(body|html|:root)?)([.:&][\w-]+|\(|\))*$/.test(s.trim()) && /(body|html|:root|\.xh-app|\.xh-dark|\.xh-mobile|:where\(\.xh-(dark|mobile)\))/.test(s)));
}

function lineOf(src, index) {
    return src.slice(0, index).split('\n').length;
}

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function collect(p) {
    let stat;
    try {
        stat = await fs.stat(p);
    } catch {
        console.warn(`skipping missing path ${p}`);
        return;
    }
    if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(path.basename(p))) return;
        for (const e of await fs.readdir(p)) await collect(path.join(p, e));
    } else if (p !== SELF && [...STYLE_EXTS, ...CODE_EXTS, ...DOC_EXTS].includes(path.extname(p))) {
        files.push(p);
    }
}

function printReport() {
    const {files, changed, hooks, renames, units, calcs, dropped, removed, warnings} = report;
    console.log(
        `\n${DRY ? '[dry] ' : ''}Done - scanned ${files} files, modified ${changed}. ` +
            `${hooks.length} hook migrations, ${renames} renames, ${units} unit additions, ` +
            `${calcs} calc simplifications, ${dropped} redundant declarations dropped.`
    );
    if (hooks.length) {
        console.log(`\nHook migrations - review each (a local variable sharing a hook name would be caught here):`);
        hooks.forEach(h => console.log(`  ${h}`));
    }
    if (removed.length) {
        console.log(`\nRemoved variables still referenced - delete these usages:`);
        removed.forEach(r => console.log(`  ${r}`));
    }
    if (warnings.length) {
        console.log(`\nWarnings - review by hand:`);
        warnings.forEach(w => console.log(`  ${w}`));
    }
}
