/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
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
        classList.toggle('bp4-dark', value);
        this.darkTheme = value;
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
}
