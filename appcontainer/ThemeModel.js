/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 *  Manage Theme.
 *
 *  @private
 */
export class ThemeModel extends HoistModel {

    @observable darkTheme = false;
    @observable themePref = 'light';
    systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    toggleTheme() {
        this.setThemePref(this.darkTheme ? 'light' : 'dark');
    }

    @action
    setDarkTheme(value) {
        const classList = document.body.classList;
        classList.toggle('xh-dark', value);
        classList.toggle('bp3-dark', value);
        this.darkTheme = value;

    }

    @action
    setThemePref(value) {
        this.setDarkTheme(value === 'dark');
        this.detectSystemTheme(value === 'system')
        this.themePref = value;
        XH.setPref('xhTheme', value);
    }

    /**
     * Detects when the user's system is in dark mode and updates the theme accordingly
     * @param {boolean} value - Whether to detect the system theme
     */
    detectSystemTheme(value) {{
        const listener = (event) => this.setDarkTheme((event.matches));
        if(value) {
            this.setDarkTheme(this.systemDarkMode.matches);
            this.systemDarkMode.addEventListener('change', listener);
        } else {
            this.systemDarkMode.removeEventListener('change', listener);
        }
    }}

    init() {
        this.setThemePref(XH.getPref('xhTheme'));
    }
}
