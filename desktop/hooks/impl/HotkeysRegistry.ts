/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, observable, observableRef} from '@xh/hoist/mobx';
import {without} from 'lodash';
import type {HotkeyConfig} from '../UseHotkeys';

/**
 * The hotkeys of every mounted component, listed in the hotkeys dialog, and whether that dialog
 * is open.
 * @internal
 */
class HotkeysRegistry {
    @observableRef accessor hotkeys: HotkeyConfig[] = [];
    @observable accessor isDialogOpen = false;

    @action
    add(hotkeys: HotkeyConfig[]) {
        this.hotkeys = [...this.hotkeys, ...hotkeys];
    }

    @action
    remove(hotkeys: HotkeyConfig[]) {
        this.hotkeys = without(this.hotkeys, ...hotkeys);
    }

    @action
    openDialog() {
        this.isDialogOpen = true;
    }

    @action
    closeDialog() {
        this.isDialogOpen = false;
    }
}

export const hotkeysRegistry = new HotkeysRegistry();
