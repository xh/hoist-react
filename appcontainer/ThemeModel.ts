/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, Theme, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * @internal
 */
export class ThemeModel extends HoistModel {
    override xhImpl = true;

    @observable
    darkTheme: boolean;

    constructor() {
        super();
        makeObservable(this);
    }

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
        // Resolve --xh-appbar-bg (a chain of var() fallbacks) to a concrete color via a throwaway
        // probe - reading computed `color` fully substitutes the var chain.
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
}
