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
    /** @member {boolean} */
    @observable darkTheme;

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    toggleTheme() {
        this.setTheme(this.darkTheme ? 'light' : 'dark');
    }

    @action
    setDarkTheme(value) {
        const classList = document.body.classList;
        classList.toggle('xh-dark', value);
        classList.toggle('bp3-dark', value);
        this.darkTheme = value;
    }

    @action
    setTheme(value, persist) {
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
                throw XH.exception("Unrecognized value for theme pref.  Must be either 'system', 'dark', or 'light'.");
        }
        if (persist) {
            XH.setPref('xhTheme', value);
        }
    }

    init() {
        this.setTheme(XH.getPref('xhTheme'));
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            if (XH.getPref('xhTheme') === 'system') {
                this.setDarkTheme(event.matches);
            }
        });
    }
}
