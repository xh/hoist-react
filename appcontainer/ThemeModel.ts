/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, Theme, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';

/**
 * Size variables that held unitless numbers before v88 and now require a length (e.g. `8px`).
 * Checked in development mode to catch app overrides left in the old form, which silently break
 * every size derived from them.
 */
const LENGTH_VARS = [
    '--xh-appbar-height',
    '--xh-appbar-title-font-size',
    '--xh-border-radius',
    '--xh-border-width',
    '--xh-button-font-size',
    '--xh-card-border-radius',
    '--xh-card-header-font-size',
    '--xh-card-header-gap',
    '--xh-card-header-min-height',
    '--xh-font-size',
    '--xh-font-size-large',
    '--xh-font-size-small',
    '--xh-form-field-info-border-width',
    '--xh-form-field-invalid-border-width',
    '--xh-form-field-warning-border-width',
    '--xh-grid-cell-padding-inline',
    '--xh-grid-compact-cell-padding-inline',
    '--xh-grid-compact-font-size',
    '--xh-grid-compact-header-font-size',
    '--xh-grid-compact-header-padding-inline',
    '--xh-grid-font-size',
    '--xh-grid-header-font-size',
    '--xh-grid-header-padding-inline',
    '--xh-grid-large-cell-padding-inline',
    '--xh-grid-large-font-size',
    '--xh-grid-large-header-font-size',
    '--xh-grid-large-header-padding-inline',
    '--xh-grid-tiny-cell-padding-inline',
    '--xh-grid-tiny-font-size',
    '--xh-grid-tiny-header-font-size',
    '--xh-grid-tiny-header-padding-inline',
    '--xh-input-font-size',
    '--xh-input-label-font-size',
    '--xh-panel-border-width',
    '--xh-panel-title-font-size',
    '--xh-popup-border-width',
    '--xh-popup-title-font-size',
    '--xh-resizable-border-width',
    '--xh-resizable-size',
    '--xh-segmented-control-border-radius',
    '--xh-segmented-control-padding',
    '--xh-spacing',
    '--xh-spacing-double',
    '--xh-spacing-half',
    '--xh-tab-font-size',
    '--xh-title-compact-font-size',
    '--xh-title-compact-height',
    '--xh-title-font-size',
    '--xh-title-height',
    '--xh-title-icon-size',
    '--xh-title-padding',
    '--xh-toolbar-compact-font-size',
    '--xh-toolbar-compact-min-size',
    '--xh-toolbar-font-size',
    '--xh-toolbar-item-spacing',
    '--xh-toolbar-min-size',
    '--xh-zone-grid-bottom-font-size',
    '--xh-zone-grid-top-font-size'
];

/**
 * @internal
 */
export class ThemeModel extends HoistModel {
    override xhImpl = true;
    override xhName = 'themeModel';

    @observable accessor darkTheme: boolean;

    @action
    toggleTheme() {
        this.setTheme(this.darkTheme ? 'light' : 'dark');
    }

    @action
    setDarkTheme(value: boolean) {
        const classList = document.body.classList;
        classList.toggle('xh-dark', value);
        classList.toggle('bp6-dark', value);

        // Set color-scheme on the document root (<html>) so browser chrome and overscroll / safe-area
        // regions match the theme - the theme class only reaches <body>, leaving the root light.
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
        document.documentElement.style.colorScheme = value ? 'dark' : 'light';

        this.darkTheme = value;
        this.syncThemeColorMeta();
    }

    @action
    setTheme(value: Theme, persist = true) {
        switch (value) {
            case 'system':
                this.setDarkTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
                break;
            case 'dark':
                this.setDarkTheme(true);
                break;
            case 'light':
                this.setDarkTheme(false);
                break;
            default:
                throw XH.exception(
                    "Unrecognized value for theme pref.  Must be either 'system', 'dark', or 'light'."
                );
        }
        if (persist) {
            XH.setPref('xhTheme', value);
        }
    }

    init() {
        this.setTheme(XH.getPref('xhTheme'));
        if (XH.isDevelopmentMode) this.warnOnUnitlessLengthVars();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (XH.getPref('xhTheme') === 'system') {
                this.setDarkTheme(event.matches);
            }
        });
    }

    /**
     * Sync the `<meta name="theme-color">` tag to the active theme's app-bar color, creating it if
     * needed. This tints browser chrome to match the app - e.g. Android Chrome's status bar and task
     * switcher, and desktop installed PWAs. Hoist's theme is independent of the OS color scheme, so
     * the tag's content must be updated on each theme change rather than relying on the static
     * `media="(prefers-color-scheme)"` form. Note Safari 26+ ignores `theme-color`, instead deriving
     * its chrome color from the page background (see the companion `color-scheme` handling above).
     */
    private syncThemeColorMeta() {
        // Resolve --xh-appbar-bg (possibly a chain of var() references) to a concrete color via a
        // throwaway probe - reading computed `color` fully substitutes the var chain.
        const probe = document.createElement('div');
        probe.style.cssText = 'display: none; color: var(--xh-appbar-bg)';
        document.body.appendChild(probe);
        const color = window.getComputedStyle(probe).color;
        probe.remove();

        // Bail if the color failed to resolve (e.g. styles not yet applied) rather than write a
        // bad value - the next theme change will sync it.
        if (!color) return;

        // Maintain our own tag, marked so we can find it again on subsequent theme changes. If an
        // app has hand-authored any theme-color tag, defer to it entirely.
        let meta = document.querySelector('meta[name=theme-color][data-xh-managed]');
        if (!meta) {
            if (document.querySelector('meta[name=theme-color]')) return;
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            meta.setAttribute('data-xh-managed', '');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', color);
    }

    /**
     * Warn about any size variable resolving to a bare number - almost always an app override not
     * yet migrated to v88, where these variables carry units. Checks the current theme only.
     */
    private warnOnUnitlessLengthVars() {
        const style = window.getComputedStyle(document.body),
            unitless = LENGTH_VARS.filter(name =>
                /^-?\d*\.?\d+$/.test(style.getPropertyValue(name).trim())
            );
        if (unitless.length) {
            this.logWarn(
                `CSS size variables must include a unit as of Hoist v88 (e.g. '8px', not '8'). ` +
                    `Unitless values found for: ${unitless.join(', ')}. ` +
                    `See docs/upgrade-notes/v88-upgrade-notes.md.`
            );
        }
    }
}
